let mysql = require('mysql')
  , config = require('../config')

config.databaseConnection.charset = 'utf8mb4_unicode_ci'
let c = mysql.createConnection(config.databaseConnection)

function query(what, options, successCallback) {
  c.query(what, options, (err, results, fields) => {
    if (err) {
      throw err
    }
    if (successCallback) {
      successCallback(results)
    }
  })
}

function select(what, tableName, where, successCallback) {
  c.query(`SELECT ${what} FROM ${tableName} WHERE ?`, where, (err, results, fields) => {
    if (err) {
      throw err
    }
    if (successCallback) {
      successCallback(results)
    }
  })
}

function selectIn(what, tableName, whereField, whereIn, successCallback) {
  let questionMarks = '?' + ',?'.repeat(whereIn.length - 1)
  c.query(`SELECT ${what} FROM ${tableName} WHERE ${whereField} IN (${questionMarks})`, whereIn, (err, results, fields) => {
    if (err) {
      throw err
    }
    if (successCallback) {
      successCallback(results)
    }
  })
}

function insert(tableName, data, successCallback) {
  c.query(`INSERT INTO ${tableName} SET ?`, data, (err, results, fields) => {
    if (err) {
      throw err
    }
    if (successCallback) {
      successCallback(results)
    }
  })
}

function update(tableName, data, where) {
  c.query(`UPDATE ${tableName} SET ? WHERE ?`, [data, where], (err, results, fields) => {
    if (err) {
      throw err
    }
  })
}

function insertOrUpdate(tableName, updateData, where) {
  let insertData = where
  for (let i in updateData) {
    insertData[i] = updateData[i]
  }
  c.query(`INSERT INTO ${tableName} SET ? ON DUPLICATE KEY UPDATE ?`, [insertData, updateData])
}

module.exports = {
  query,
  select,
  selectIn,
  insert,
  update,
  insertOrUpdate,
}
