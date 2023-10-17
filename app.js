const Client = require('rippled-ws-client');
const { parseBalanceChanges } = require('ripple-lib-transactionparser');

const app = async (account, cb, isoEndDate, returnTx) => {
  const display = result => {
    if (result?.transactions) {
      for (const r of result.transactions) {
        const { tx, meta } = r;
        let direction = 'other';
        if (tx?.Account === account) direction = 'sent';
        if (tx?.Destination === account) direction = 'received';
        let moment = new Date((tx.date + 946684800) * 1000).toISOString();
        
        // Check if the transaction date is greater than the cutoff date (isoEndDate)
        if (moment <= isoEndDate) {
          return; // Skip this transaction and continue to the next one
        }

        const balanceChanges = parseBalanceChanges(meta);
        if (Object.keys(balanceChanges).indexOf(account) > -1) {
          const mutations = balanceChanges[account];
          for (const mutation of mutations) {
            let currency = mutation.counterparty === '' ? 'XRP' : `${mutation.counterparty}.${mutation.currency}`;
            const isFee = direction === 'sent' && Number(mutation.value) * -1 * 1000000 === Number(tx?.Fee) ? 1 : 0;
            const fee = direction === 'sent' ? Number(tx?.Fee) / 1000000 * -1 : 0;

            //console.log(tx)
            //console.log(mutation.value)

            // I don't track the fractions of XRP used for gas or XPR received for spam messages (less than 0.01 XRP, sent or received), so create blank entries for these conditions
            //if (tx?.TransactionType === 'NFTokenCreateOffer' || tx?.TransactionType === 'NFTokenAcceptOffer' || tx?.TransactionType === 'NFTokenCancelOffer' || mutation.value <= 0.001) {
            if (currency === 'XRP' && mutation.value <= 0.01) {
                moment = undefined
                tx.TransactionType = undefined
                mutation.value = undefined
                currency = undefined
                tx.hash = undefined
            }

            cb({
              "Time": undefined,
              "Raw Time": moment,
              "Type": tx.TransactionType,
              "Amount": mutation.value,
              "Currency": currency,
              "Counterparty": mutation.counterparty,
              "Counterparty name": undefined,
              "balance": undefined,
              "Hash": tx.hash,
              _tx: returnTx ? tx : undefined,
              _meta: returnTx ? meta : undefined,
            });
          }
        }
      }
    }
  }

  const client = await new Client('wss://xrplcluster.com', {
    NoUserAgent: true,
  });

  const getMore = async marker => {
    const result = await client.send({
      command: 'account_tx',
      account,
      limit: 10,
      marker,
    });

    //display(result);

    if (result.transactions.length === 0 || new Date((result.transactions[0].tx.date + 946684800) * 1000).toISOString() <= isoEndDate) {
      return null; // No more transactions or reached the cutoff date
    }

    let earliestDate = 946684800

    if (result?.transactions) {
        result.transactions.forEach(r => {
            const { tx } = r
            //console.log(tx.date)
            if ( tx.date < earliestDate) {
            earliestDate = tx.date
            }
            // if ( tx.TransactionType === 'Payment') {
            //   console.log(tx.TransactionType)
            // }

            //console.log(earliestDate)
        })

    const ledgerDate = (new Date((earliestDate + 946684800) * 1000)).toISOString()
    //console.log(ledgerDate)

    if (isoEndDate <= ledgerDate) {
        display(result)
        return result?.marker
        }
    } 

  }

  let proceed = await getMore();

  while (proceed) {
    proceed = await getMore(proceed);
  }

  client.close();
}

const fields = [
  'Time',
  'Raw Time',
  'Type',
  'Amount',
  'Currency',
  'Counterparty',
  'Counterparty name',
  'Balance',
  'Hash',
];

module.exports = {
  app,
  fields,
};