# XRPL transaction exporter improved (for Koinly import)

This small node app fetches transactions for an account and returns the results in CSV (when called from the command line) or as a parsed object (when used as a node module).  It will use a date command as part of the command line and will stop pulling transactions once it goes beyond (if you want everything use some long ago date).  It also has a very crude way to compile Koinly ID's for tokens (specifically for XRP IOU tokens that were issued before NFT's came to the XRPL).

Uses [xrplcluster.com](https://xrplcluster.com) full history nodes.

I forked https://github.com/WietseWind/xrpl-tx-exporter-csv (Thank you WietseWind! &#9829;) and feel like I improved it... :)... it's specifically designed to output a .csv that can be imported directly into Koinly with just the important transactions.  Since Koinly's business model is to charge per transaction recorded, I personally get rid of "nonsense" transactions that would net zero tax liability. If you want these transactions, it's pretty easy to comment out my changes and get them but if you play with NFTs on the XRPL at all you will literally have thousands of entries per year for creating and cancelling offers that Koinly will happily charge you for (and push you to a bigger tier) but won't add to your tax liability by even $1.

Note: I originally used GateHub's free export .csv option that was publicly available without an account (https://gatehub.net/explorer/rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY - Transactions tab - Export CSV) to produce a Koinly supported .csv for import. It required a lot of massaging to the .csv before import (especially with any custom currency where the ticker matched some other chain's token) but worked well enough. Then one day I went to export and the option was gone!  It has since returned (I guess I wasn't the only one to complain) but before it did, it was enough of a push to create something specific to my needs.  I've purposely kept the basic GateHub column names, even when I don't populate with values, since I know it works. 

### Exported columns:

- Time (undefined)
- Raw Time (datetime in UTC)
- Type (XRPL Transaction Type)
- Amount (amount in XRP (not drops) or IOU)
- Currency (XRP or KoinlyID of token)
- Counterparty ()
- Counterparty name (undefined)
- Balance (undefined)
- Hash (tx.Hash)

# Run: commandline (to CSV) - The way I do it

I run this on Ubuntu 20.04 and do it this way.  See ORIGINAL for WietseWind's instructions.

## Install

Get latest nvm (Node Version Manager) - see https://github.com/nvm-sh/nvm

`curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash` </br>
`source ~/.bashrc`

Get latest node LTS (long-term support)

`nvm install --lts`

Get xrpl-tx-exporter

`git clone https://github.com/go140point6/xrpl-tx-exporter-csv.git`</br>
`cd xrpl-tx-exporter-csv`</br>
`npm install`

## Run

`node index.js {account} {earliest_date} {koinlySearch}`

{account} = your wallet address (rXXX...) - REQUIRED</br>
{end_date} = how far back to go in format YYYYMMDD - REQUIRED</br>
{koinlySearch} = counterparty.currency values missing from customTokens.csv, argument can only be true - OPTIONAL (see below)</br>

Example:</br>
`node index.js rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY 20230101`

## Store output as CSV

`node index.js {account} {earliest_date} {koinlySearch} > {some-file}`

`node index.js rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY 20230101 > rPEPPER7k-20230101.csv`

Small values: Currently I am disregarding any XRP value less than 0.05 XRP (either way) so you will get lots of empty lines.  This is OK, Koinly will ignore empty lines.

STOP! message: Always run to screen and observe, looking for STOP! messages if unfamiliar currency is detected.  It is then recommended that you run with the koinlySearch true switch and output to file for processing to add to data/customTokens.csv.

## koinlySearch and coming up with the KoinlyID

Review the custom currencies I have compiled in data/customTokens.csv, you will add to this file anything specific to your wallet that you find. This is labor intensive but is the only way I've found to accurately import into Koinly consistently, but finding the KoinlyID is a pain.  Here is how I do it:

- `node index.js rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY 20000101 > rPEPPER7k-koinlySearchAllDates.csv`</br>
- Open the .csv and convert to to table, select column A to show "KoinlyID NOT FOUND". You will see the currency in column B.  Ignore everything else.</br>
- For each currency, in Koinly, add a new Deposit transaction (temporarily) of quantity 1 and paste in the currency.  Koinly will think and then show a match.  Click on the coin it shows, and save the transaction.</br>
- Find your transaction by filtering your Transactions to that currency (paste it in) and clicking it to save the filter.  Now refresh the page (F5) and you should see the "friendly name" replaced with the KoinlyID.  Save that number and delete the transaction.</br>
- 95% of the time, the full currency found the Koinly equivalent entry, but a few times it didn't.  Try just the counterparty (first part of the currency) if the currency doesn't seem to work.</br>
- Work your way through all your custom tokens, adding entries to data/customTokens.csv as needed.  Once done, output your transactions to screen again looking for any STOP! messages.  If none, all your custom token transactions are accounted for.

## Koinly, NFT IOU tokens, and NFTs on the XRPL

The biggest issue tracking cryptocurrency and NFTs for tax purposes in Koinly is ensuring cost basis stays with the specific NFT.  I have never found a way to find a specific NFT in Koinly (at least, nothing I own on the XRPL) so I had to come up something. Koinly has NULL coins but not near enough to allow for every individual NFT I own. Keep in mind that in the US (where I'm based) the act of converting an NFT IOU token to an NFT is a taxable event (for gain or loss), and while NFT IOU Tokens are fungible, the NFT is not (duh), so you have to capture cost basis.  Here is how I solved it:

- Every NFT IOU Token can be assigned a KoinlyID, ideally finding the real KoinlyID but really you can use any KoinlyID that doesn't pull pricing.  Koinly does not, as of this writing, assign pricing info to even the correctly identified IOU tokens, so you will need to price it manually.  I've found https://xrpl.to/ to be an immense help.</br>
- Pair up each KoinlyID with a NULL token.  As of this writing there seems to be about 330 NULL tokens (NULL, NULL1, NULL2, etc.).  This NULL token will represent the entire collection.  For example, my favorite XRPL NFT Collection is https://xrp.cafe/collection/xshrooms and I've assigned that to NULL35.</br>
- During minting, 0.5 xShrooms IOU Token equaled one xShrooms NFT and that conversion was a taxable event, an exchange of one token for another. As I cleaned up my imported transactions, I switch what Koinly saw as a "Withdrawal" of the IOU token to an unknown wallet to an "Exchange" of that 0.5 IOU token going to 1 NULL35 token in my same wallet, and Koinly would correctly calculate cost basis gain/loss for that transaction.  I noted the exact NFT number in the description and I have all my NFTs in a spreadsheet for easier lookup.
- When done, I had zero xShrooms NFT IOU tokens and say 20 xShrooms NFTs.  What happens when I sell one NFT?  I can go back and find the exact cost basis for that particular NFT but I can't just sell one NULL35 token because the cost basis wouldn't be correct.  I found that I could manually deposit 1 xShrooms IOU Token with a date/time just a minute or two before the sale and assign it the correct cost basis based on my records.  Then the "Deposit" that Koinly captured on import (having no idea where the XRP came from) could be switched to an "Exchange" of one xShrooms IOU Token to XRP and since there would only be the token I just added, the cost basis would be correct. The most important part is DO NOT assign a tag to this phantom deposit!  If you leave it just as a "Deposit" then it won't be included in your yearly income report (you *should* double-check this at years end, because if it somehow does get added as income, you will be taxed on this phantom deposit).
- I have not found another way to correctly assign cost basis and this one seems to work. What if I sell all 20 of my NFTs, what do I do with all those NULL35 tokens since I still show that I hold 20 NULL35 tokens? Nothing, I don't care as I don't use Koinly to track my portfolio, I just use it to prepare documentation for tax time. Those NULL35 tokens are just placeholders that I no longer need to hold places.

# Run: as a module

See ORIGINAL, I haven't tested or developed for this, as I only care about getting the .csv from the command line. It likely doesn't work with my changes.

# Run: browser

See ORIGINAL, I haven't tested or developed for this, as I only care about getting the .csv from the command line. It likely doesn't work with my changes.

# Run: commandline (to CSV) - ORIGINAL

## Install

`npm install`

If you are new to anything code / nodejs related:

1. Install nodejs, `2:30` @ https://www.youtube.com/watch?v=9gVK6fp3UOo
2. Download this source: https://github.com/go140point6/xrpl-tx-exporter-csv/archive/refs/tags/v2.0.1.zip
3. Extract the ZIP and open your commandline, navigate to the folder where you extracted the ZIP
4. Type: `npm install`
5. Run (see below)

## Run

`node index.js {account}`
eg.
`node index.js rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY`

## Store output as CSV

`node index.js {account} > {some-file}`
eg.
`node index.js rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY > export.csv`

# Run: as a module

Import `app` and call as function.

Call: `app(account, callback)`. See example use in [index.js](https://github.com/WietseWind/xrpl-tx-exporter-csv/blob/main/index.js)

# Run: browser

Ready to use: **[dist/index.html](https://raw.githack.com/WietseWind/xrpl-tx-exporter-csv/main/dist/index.html)**

Get the browserified version from the `dist` folder, and see `run as module`.
Ready to use: https://cdn.jsdelivr.net/npm/xrpl-tx-export/dist/xrpl-tx-export.js

Sample:
https://jsfiddle.net/WietseWind/vtL3msaw

Build for the browser using `npm run build` if working from source.