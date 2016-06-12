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

let lastSaved = {}

function save(id, content, successCallback) {
  let now = +new Date
    , row = {
        id,
        content: JSON.stringify(content),
        fetchedAt: now,
      }

  if (id in lastSaved) {
    if (lastSaved[id] < now - 100) {
      /* No need to update if saved less than 100ms ago. This happens when
       * fetch.unique has succeeded and multiple success callbacks are called.
       */
      db.update('cache', row, {
        id,
      })
      lastSaved[id] = now
      return
    }

    db.update('cache', row, {
      id,
    })
    lastSaved[id] = now
    return
  }

  lastSaved[id] = now
  this.get(id, null, (results) => {
    db.update('cache', row, {
      id,
    })
  }, () => {
    db.insert('cache', row)
  })
}

module.exports = {
  get,
  save,
}
