# XRPL and XAHL transaction exporter improved (for Koinly import)

This small node app fetches transactions for a single account OR a list of accounts and returns the results in CSV. It will use a date command as part of the command line and will stop pulling transactions once it goes beyond (if you want everything use some long ago date). It also has a very crude way to compile Koinly ID's for tokens. It works on both XRPL and XAHL.

Uses [xrplcluster.com](https://xrplcluster.com) full history node for XRPL and [xahaua.network](https://xahau.network) for XAHL.

I forked https://github.com/WietseWind/xrpl-tx-exporter-csv (Thank you WietseWind! &#9829;). My customizations are designed to produce a ready-to-import .csv into Koinly and EXCLUDE minor tx that result in no tax liability (i.e. spam messages, creating/removing offers, etc.). If you want all tx, see comments in app.js and comment out the appropriate section.

### Exported columns:

- Time (undefined)
- Raw Time (datetime in UTC)
- Type (XRPL Transaction Type)
- Amount (amount in XRP (not drops) or IOU)
- Currency (XRP or KoinlyID of token)
- Counterparty (mutation.counterparty)
- Counterparty name (undefined)
- Balance (undefined)
- Hash (tx.Hash)

# Run: commandline - The way I do it

I run this on Ubuntu 20.04 and 22.04, and do it this way.  See ORIGINAL for WietseWind's instructions.

## Install

Get latest nvm (Node Version Manager) - see https://github.com/nvm-sh/nvm

`curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash` </br>
`source ~/.bashrc`

Get latest node LTS (long-term support)

`nvm install --lts`

Get xrpl-tx-exporter

`git clone https://github.com/go140point6/xrpl-tx-exporter-csv.git`</br>
`cd xrpl-tx-exporter-csv`</br>
`npm install`

Copy myAddresses.csv.sample to myAddresses.csv and add all the XRPL and XAHL wallets you want to export from. If you have the same address on both sides, be sure to designate 'xrp' or 'xah' (add the address twice - see examples)

## Run

`node index.js {account} {end_date} {ledger} {koinlySearch}`

{account} = your wallet address (rXXX...) OR the word "LIST" to use the .csv created array - REQUIRED</br>
{end_date} = how far back to go in format YYYYMMDD - REQUIRED</br>
{ledger} = which ledger to use. Only "XRP" or "XAH" are valid, default is "XRP" - OPTIONAL</br>
{koinlySearch} = counterparty.currency values missing from customTokens.csv, argument can only be true - OPTIONAL (see below)</br>

Example #1 - Single address on XRPL going back forever:</br>
`node index.js rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY 20000101`

Example #2 - Single address on XAHL going back to start of 2024:</br>
`node index.js rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY 20240101 XAH`

Example #3 - Multiple addresses on XRPL going back to start of 2023:</br>
`node index.js LIST 20230101`

Example #4 - Multiple addresses on XAHL going back forever:</br>
`node index.js LIST 20200101 XAH`

## STOP! Messages

STOP! message: Always observe output to screen, looking for STOP! messages if unfamiliar currency is detected. It is then recommended that you run with the koinlySearch true switch for processing to add to data/customTokens.csv. Once all your custom tokens are added, you can proceed to get a clean file for import.

## Store output as CSV

CSV files are created in the 'output' directory on every run and named {account}.{ledger}.{end_date}.csv. You no longer have to redirect this at the command line.

## koinlySearch and coming up with the KoinlyID

Review the custom currencies I have compiled in data/customTokens.csv, you will add to this file anything specific to your wallet that you find. This is labor intensive but is the only way I've found to accurately import into Koinly consistently. Here is how I do it:

- Run command on a single address or LIST, but use the koinlySearch option of true (see ##Run instructions)</br>
- Open the .csv and convert to to table in your spreadsheet software, select column A to show "KoinlyID NOT FOUND". You will see the currency in column B and should get rid of duplicates. Ignore everything else.</br>
- For each unique currency, in Koinly, add a new Deposit transaction (temporarily) of quantity 1 and paste in the FULL currency (counterparty.currency). Koinly will think and then (usually) show a match. Click on the token it shows, and save the transaction.</br>
- Filter your transactions to just that currency (paste in FULL currency) and clicking it to save the filter. Now refresh the page (F5) and look in the URL for the currency_id=<digits>. Save that number and delete the transaction.</br>
- Work your way through all your custom tokens, adding entries to data/customTokens.csv as needed.  Once done, output your transactions to screen again looking for any STOP! messages.  If none, all your custom token transactions are accounted for.

## Koinly and AMM Liquidity Pool tokens

You can find AMM LP tokens the same way as above. After import you may have to match a single deposit with your two withdrawals but Koinly is generally good at splitting that automatically. If there is an issue with Koinly refusing to create a pool, you may have to use the generic LP tokens (LP1, LP2, etc) like you do with NULL tokens.

## Koinly, NFT IOU tokens, and NFTs on the XRPL

The biggest issue tracking cryptocurrency and NFTs for tax purposes in Koinly is ensuring cost basis stays with the specific NFT.  I have never found a way to find a specific NFT in Koinly (at least, nothing I own on the XRPL) so I had to come up something. Koinly has NULL coins but not near enough to allow for every individual NFT I own. Keep in mind that in the US (where I'm based) the act of converting an NFT IOU token to an NFT is a taxable event (for gain or loss), and while NFT IOU Tokens are fungible, the NFT is not (duh), so you have to capture cost basis.  Here is how I solved it:

- Every NFT IOU Token can be assigned a KoinlyID, ideally finding the real KoinlyID but really you can use any KoinlyID that doesn't pull pricing.  Koinly does not, as of this writing, assign pricing info to even the correctly identified IOU tokens, so you will need to price it manually.  I've found https://xrpl.to/ to be an immense help.</br>
- Pair up each KoinlyID with a NULL token.  As of this writing there seems to be about 330 NULL tokens (NULL, NULL1, NULL2, etc.).  This NULL token will represent the entire collection.  For example, my favorite XRPL NFT Collection is https://xrp.cafe/collection/xshrooms and I've assigned that to NULL35.</br>
- During minting, 0.5 xShrooms IOU Token equaled one xShrooms NFT and that conversion was a taxable event, an exchange of one token for another. As I cleaned up my imported transactions, I switch what Koinly saw as a "Withdrawal" of the IOU token to an unknown wallet to an "Exchange" of that 0.5 IOU token going to 1 NULL35 token in my same wallet, and Koinly would correctly calculate cost basis gain/loss for that transaction.  I noted the exact NFT number in the description and I have all my NFTs in a spreadsheet for easier lookup.
- When done, I had zero xShrooms NFT IOU tokens and say 20 xShrooms NFTs.  What happens when I sell one NFT?  I can go back and find the exact cost basis for that particular NFT but I can't just sell one NULL35 token because the cost basis wouldn't be correct.  I found that I could manually deposit 1 xShrooms IOU token with a date/time just a minute or two before the sale (assuming a short-term gain of less than 365 days... use a date 366 days ago if you've held the NFT over a year) and assign it the correct cost basis based on my records.  Then the "Deposit" that Koinly captured on import (having no idea where the XRP came from) could be switched to an "Exchange" of one xShrooms IOU Token to XRP and since there would only be the token I just added, the cost basis would be correct. The most important part is DO NOT assign a tag to this phantom deposit!  If you leave it just as a "Deposit" then it won't be included in your yearly income report (you *should* double-check this at years end, because if it somehow does get added as income, you will be taxed on this phantom deposit).
- In some cases dealing with long-term capital gains, I've had to use a different NULL token to stand-in as a placeholder to get gains/loss correct. Track what you use in a spreadsheet.
- I have not found another way to correctly assign cost basis and this one seems to work. What if I sell all 20 of my NFTs, what do I do with all those NULL35 tokens since I still show that I hold 20 NULL35 tokens? Nothing, I don't care as I don't use Koinly to track my portfolio, I just use it to prepare documentation for tax time. Those NULL35 tokens are just placeholders that I no longer need to hold places.

# Run: as a module

See ORIGINAL, I haven't tested or developed for this, as I only care about getting the .csv. It likely doesn't work with my changes but I haven't tested it.

# Run: browser

See ORIGINAL, I haven't tested or developed for this, as I only care about getting the .csv. It likely doesn't work with my changes but I haven't tested it.

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
