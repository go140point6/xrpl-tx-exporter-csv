const {app, fields} = require('./app.js')

// Check if on the CLI
if (process && typeof process.exit == 'function') {
  const account = process.argv.length > 2
    ? process.argv[2] 
    : ''

  const endDate = process.argv.length > 3
    ? process.argv[3]
    : ''
  
  if (!account.match(/^r[a-zA-Z0-9]{15,}/) || !endDate || !/^\d{8}$/.test(endDate)) {
    console.log('Usage: node index.js <XRPL account> <end_date (YYYYMMDD)>')
    if (process && typeof process.exit == 'function') {
      process.exit(1)
    }
  }

  const year = endDate.slice(0, 4)
  const month = endDate.slice(4, 6)
  const day = endDate.slice(6, 8)
  const date = new Date(`${year}-${month}-${day}`)
  const isoEndDate = date.toISOString()

  console.log(fields.join(','))

  app(account, r => {
    console.log(fields.map(f => {
      return typeof r[f] === 'undefined' ? '' : String(r[f]);
    }).join(','));
  }, isoEndDate); // Pass the endDate argument to app function
} 

module.exports = {
  app,
  fields
}