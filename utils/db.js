let mysql = require('mysql')
  , config = require('../config')

let c = mysql.createConnection(config.databaseConnection)

function insert(tableName, data, successCallback) {
  c.query(`INSERT INTO ${tableName} SET ?`, data, (err, results, fields) => {
    if (err) {
      throw err
    }
    successCallback(results)
  })
}

function update(tableName, data, where) {
  c.query(`UPDATE ${tableName} SET ? WHERE ?`, [data, where], (err, results, fields) => {
    if (err) {
      throw err
    }
  })
}

module.exports = {
  insert,
  update,
}
