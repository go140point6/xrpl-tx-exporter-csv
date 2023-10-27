const Client = require('rippled-ws-client');
const { parseBalanceChanges } = require('ripple-lib-transactionparser');
const sharedArrays = require('./shared/sharedArrays');

const app = async (account, cb, endTxDate, koinlySearch, returnTx) => {
  const display = result => {
    if (result?.transactions) {
      for (const r of result.transactions) {
        const { tx, meta } = r;
        let currentTxDate = (tx.date + 946684800) // 946684800 is the Ripple Epoch of Jan 1, 2000
        if (currentTxDate > endTxDate) {
          //console.log("tx_date is in scope")
        } else {
          //console.log("tx_date expired!")
          result.marker = undefined
          return;
        }

        let direction = 'other';
        if (tx?.Account === account) direction = 'sent';
        if (tx?.Destination === account) direction = 'received';
        let moment = new Date((tx.date + 946684800) * 1000).toISOString();

        const balanceChanges = parseBalanceChanges(meta);
        if (Object.keys(balanceChanges).indexOf(account) > -1) {
          const mutations = balanceChanges[account];
          for (const mutation of mutations) {
            let currency = mutation.counterparty === '' ? 'XRP' : `${mutation.counterparty}.${mutation.currency}`;
            const isFee = direction === 'sent' && Number(mutation.value) * -1 * 1000000 === Number(tx?.Fee) ? 1 : 0;
            const fee = direction === 'sent' ? Number(tx?.Fee) / 1000000 * -1 : 0;

            if (koinlySearch === true) {
              //console.log("koinlySearch is ON!")
              //result.marker = undefined
              const token = sharedArrays.support.customTokens.find((row) => row.counterparty === mutation.counterparty)
              if (!token && currency !== 'XRP' && mutation.counterparty) {
                console.log('KoinlyID NOT FOUND,', currency)
              }
            }

            // I don't track the fractions of XRP used for gas or XPR received for spam messages (less than 0.05 XRP, sent or received), so create blank entries for these conditions
            //if (tx?.TransactionType === 'NFTokenCreateOffer' || tx?.TransactionType === 'NFTokenAcceptOffer' || tx?.TransactionType === 'NFTokenCancelOffer' || mutation.value <= 0.001) {
            if (currency === 'XRP' && mutation.value >= -0.05 && mutation.value <= 0.05) {
              moment = undefined
              tx.TransactionType = undefined
              mutation.value = undefined
              currency = undefined
              tx.hash = undefined
            }

            // Currency is what Koinly uses, this is counterparty.currency either something like rHiPGSMBbzDGpoTPmk2dXaTk12ZV1pLVCZ.484144414C495445000000000000000000000000 or
            // rDuckCoinu8jntxtYoWRhEv4oNvsLYx6EQ.RDC (anything greater than 3 characters in currency results in the hex above) but you can't import these, so they need to
            // be changed to the koinly ID (ID:123456).  To find the Koinly ID, create a new test deposit using the counterparty.currency as the token (in most cases, sometimes just
            // counterparty, sometimes neither, might be common ticker (i.e. EQ)... but mostly it's counterparty.currency), then in the main
            // transactions page, filter to that counterparty.currency and you should find your one test deposit.  Refresh the page and when it refreshes, it should be
            // showing the koinly ID.  Delete your test deposit and update the sharedArrays.csv with this info.
            
            if (currency !== 'XRP' && mutation.counterparty && koinlySearch === false) {
                const token = sharedArrays.support.customTokens.find((row) => row.counterparty === mutation.counterparty)
                if (token) {
                    currency = token.koinlyid
                } else {
                  console.log('KoinlyID NOT FOUND,', currency)
                  console.log('STOP! Koinly ID for ', mutation.counterparty, ' not found in customTokens.csv.  Recommend you run again with the <koinlySearch> argument to get all missing counterparty.currency entries in a .csv to fix before running again.')
                  result.marker = undefined
                }
            }

            cb({
              "Time": undefined,
              "Raw Time": moment,
              "Type": tx.TransactionType,
              "Amount": mutation.value,
              "Currency": currency,
              "Counterparty": mutation.counterparty,
              "Counterparty name": undefined,
              "Balance": undefined,
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

    if (result?.transactions) {
        display(result)
        return result?.marker
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