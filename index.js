const { createMainArray, createSupportArrays } = require('./utils/createArrays');
const sharedArrays = require('./shared/sharedArrays');
const {app, fields} = require('./app.js');

// Check if on the CLI

(async () => {
  try {
    const main = await createMainArray()
    sharedArrays.support = await createSupportArrays()

    const account = process.argv.length > 2
    ? process.argv[2] 
    : ''

    const endDate = process.argv.length > 3
      ? process.argv[3]
      : ''

    let koinlySearch = process.argv.length > 4
      ? process.argv[4]
      : undefined

    if (!account.match(/^r[a-zA-Z0-9]{15,}/) || !endDate || !/^\d{8}$/.test(endDate)) {
      console.log('Usage: node index.js <XRPL account> <end_date> <koinlySearch>')
      console.log('<XRPL account> = your wallet address (rXXX...) - REQUIRED')
      console.log('<end_date> = how far back to go in format YYYYMMDD - REQUIRED')
      console.log('<koinlySearch> = see README.MD, couterparty.currency values missing from customTokens.csv, argument can only be true - OPTIONAL')
      if (process && typeof process.exit == 'function') {
        process.exit(1)
      }
    }

    const year = endDate.slice(0, 4)
    const month = endDate.slice(4, 6)
    const day = endDate.slice(6, 8)
    const endTxDate = new Date(`${year}-${month}-${day}`).getTime() / 1000 // endTxDate in unix epoch

    console.log(fields.join(','))

    if (koinlySearch === undefined) {
      koinlySearch = false
      app(account, r => {
        console.log(fields.map(f => {
          return typeof r[f] === 'undefined' ? '' : String(r[f]);
        }).join(','));
      }, endTxDate, koinlySearch) // Pass the endDate and koinlySearch false to app function
    } else if (koinlySearch === 'true') {
      koinlySearch = true
      app(account, r => {
        console.log(fields.map(f => {
          return typeof r[f] === 'undefined' ? '' : String(r[f]);
        }).join(','));
      }, endTxDate, koinlySearch) // Pass the endDate and koinlySearch true to app function
    } else {
      console.log("<koinlySearch>, if provided, must be true (false is default).")
    }
  } catch (error) {
    console.error("An error occured created arrays: ", error)
  }
})()

module.exports = {
  app,
  fields
}