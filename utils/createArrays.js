const fs = require('fs')
const { parse } = require('csv-parse')

mainArray = []

// In mainArrays.csv, place all your needed supportArrays.  Creates an array to use in next function.
createMainArray = async () => {
    return new Promise((resolve, reject) => {
        fs.createReadStream(`./data/mainArrays.csv`)
        .pipe(parse({ delimiter: ",", columns: true }))
        .on('data', function (row) {
            mainArray.push(row) 
        })
        .on('end', function() {
            resolve(mainArray)
            //console.log(mainArray)
        })
        .on('error', function(err) {
            reject(err)
        })
    })
}

// Creates the needed supportArrays as defined in your mainArrays.csv.  Each will take the name given in that file.
createSupportArrays = async () => {
    const promises = mainArray.map((row) => {
        return new Promise((resolve, reject) => {
            const newArray = []

            fs.createReadStream(`./data/${row.file}`)
            .pipe(parse({ delimiter: ",", columns: true }))
            .on('data', function (data) {
                newArray.push(data)
            })
            .on('end', function() {
                resolve({ name: row.name, data: newArray })
            })
            .on('error', function(err) {
                reject(err)
            })
        })
    })

    return Promise.all(promises)
    .then((result) => {
        const namedArrays = {}
        result.forEach((item) => {
            namedArrays[item.name] = item.data
        })
        return namedArrays
    })
}

module.exports = { 
    createMainArray,
    createSupportArrays
  }