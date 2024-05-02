const { createMainArray, createSupportArrays } = require('./utils/createArrays');
const sharedArrays = require('./shared/sharedArrays');
const {app, fields} = require('./app.js');
const fs = require('fs');
const path = require('path');

// Function to create directory if it doesn't exist
const createDirectoryIfNotExists = async(directory) => {
  if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true }); // Create directory recursively
  }
}

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

    let ledger = process.argv.length > 4
      ? process.argv[4]
      : undefined

    let koinlySearch = process.argv.length > 5
      ? process.argv[5]
      : undefined

    if ((account !== 'LIST' && !account.match(/^r[a-zA-Z0-9]{15,}/)) || !endDate || !/^\d{8}$/.test(endDate)) {
      console.log('Usage: node index.js <account> <end_date> <ledger> <koinlySearch>')
      console.log('<account> = your wallet address (rXXX...) OR the word "LIST" to use the .csv created array - REQUIRED')
      console.log('<end_date> = how far back to go in format YYYYMMDD - REQUIRED')
      console.log('<ledger> = which ledger to use. Only "XRP" or "XAH" are valid, default is "XRP" - OPTIONAL')
      console.log('<koinlySearch> = see README.MD, couterparty.currency values missing from customTokens.csv, argument can only be true - OPTIONAL')
      if (process && typeof process.exit == 'function') {
        process.exit(1)
      }
    }

    const year = endDate.slice(0, 4)
    const month = endDate.slice(4, 6)
    const day = endDate.slice(6, 8)
    const endTxDate = new Date(`${year}-${month}-${day}`).getTime() / 1000 // endTxDate in unix epoch

    if (ledger === undefined || ledger === 'XRP') {
      ledger = 'XRP'
    } else if (ledger === 'XAH') {
      ledger = 'XAH'
    } else {
      console.log('<ledger>, if provided, must be "XRP" or "XAH" (XRP is default).')
      return
    }

    if (koinlySearch === undefined || koinlySearch === 'false') {
      koinlySearch = false.toString()
    } else if (koinlySearch === 'true') {
      koinlySearch = true.toString()
    } else {
      console.log('<koinlySearch>, if provided, must be "true" (false is default).')
      return
    }

    //console.log(fields.join(','))
    
    if (account === 'LIST') {
      for (const entry of sharedArrays.support.myAddresses) {
        if (entry.ledger === ledger.toLowerCase()) {
          const account = entry.address
          const folderPath = path.join(__dirname, 'output')
          await createDirectoryIfNotExists(folderPath)
          const fileName = `${account}.${ledger}.${endDate}.csv`
          const filePath = path.join(folderPath, fileName)
          const fileStream = fs.createWriteStream(filePath)
          fileStream.write(fields.join(',') + '\n') // Write headers to file
          fileStream.on('error', (err) => {
            console.error('Error writing to file:', err);
          })
          console.log('\n')
          console.log(`### Processing ${entry.notes} with address ${account} on the ${ledger} ledger ###`)
          console.log(fields.join(','))
          if (koinlySearch === 'false') {
            //koinlySearch = false.toString()
            await app(account, r => {
              const csvData = fields.map(f => typeof r[f] === 'undefined' ? '' : String(r[f])).join(',')
              console.log(csvData); // Output to console
              fileStream.write(csvData + '\n') // Write to file
            }, endTxDate, koinlySearch, ledger) // Pass the endDate and koinlySearch false to app function
            //fileStream.end()
          } else if (koinlySearch === 'true') {
            //koinlySearch = true.toString()
            await app(account, r => {
              const csvData = fields.map(f => typeof r[f] === 'undefined' ? '' : String(r[f])).join(',')
              console.log(csvData) // Output to console
              fileStream.write(csvData + '\n') // Write to file
            }, endTxDate, koinlySearch, ledger) // Pass the endDate and koinlySearch false to app function
            //fileStream.end()
          } else  {
            console.log('Some error with koinlySearch option.')
            return
          }
        } 
      }
    } else {
      const folderPath = path.join(__dirname, 'output')
      const fileName = `${account}.${ledger}.${endDate}.csv`
      await createDirectoryIfNotExists(folderPath)
      const filePath = path.join(folderPath, fileName)
      const fileStream = fs.createWriteStream(filePath)
      fileStream.write(fields.join(',') + '\n') // Write headers to file
      fileStream.on('error', (err) => {
        console.error('Error writing to file:', err);
      })
      console.log(`### Processing address ${account} on the ${ledger} ledger ###`)
      console.log(fields.join(','))
      if (koinlySearch === 'false') {
        //koinlySearch = false.toString()
        app(account, r => {
          const csvData = fields.map(f => typeof r[f] === 'undefined' ? '' : String(r[f])).join(',')
          console.log(csvData) // Output to console
          fileStream.write(csvData + '\n') // Write to file
        }, endTxDate, koinlySearch, ledger) // Pass the endDate and koinlySearch false to app function
        //fileStream.end()
      } else if (koinlySearch === 'true') {
        //koinlySearch = true.toString()
        app(account, r => {
            const csvData = fields.map(f => typeof r[f] === 'undefined' ? '' : String(r[f])).join(',')
            console.log(csvData) // Output to console
            fileStream.write(csvData + '\n') // Write to file
        }, endTxDate, koinlySearch, ledger) // Pass the endDate and koinlySearch true to app function
        //fileStream.end()
      } else  {
        console.log('Some error with koinlySearch option.')
        return
      }
    }
  } catch (error) {
    console.error('An error occurred while creating arrays: ', error)
  }
})()

module.exports = {
  app,
  fields
}