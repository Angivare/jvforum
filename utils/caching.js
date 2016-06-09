let db = require('./db')
  , config = require('../config')

function get(id, maxAge, successCallback, failCallback) {
  db.select('fetchedAt, content', 'cache', {id}, (results) => {
    if (results.length) {
      let age = (+new Date - results[0].fetchedAt) / 1000
      if (age < maxAge) {
        return successCallback(JSON.parse(results[0].content), age)
      }
    }
    return failCallback()
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
  get,
  save,
}
