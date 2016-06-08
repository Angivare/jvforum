let db = require('./db')
  , config = require('../config')

function has(id, successCallback, failCallback) {
  db.select('fetchedAt', 'cache', {id}, (results) => {
    if (results.length) {
      successCallback(results[0].fetchedAt)
    }
    else {
      failCallback()
    }
  })
}

function save(id, content, successCallback) {
  db.insert('cache', {
    id,
    content: JSON.stringify(content),
    fetchedAt: +new Date,
  })
}

module.exports = {
  has,
  save,
}
