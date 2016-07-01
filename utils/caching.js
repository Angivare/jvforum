let db = require('./db')
  , config = require('../config')

function get(id, maxAge, successCallback, failCallback) {
  db.select('fetchedAt, content', 'cache', {id}, (results) => {
    if (results.length) {
      let age = (+new Date - results[0].fetchedAt) / 1000
      if (!maxAge) {
        return successCallback(JSON.parse(results[0].content), age)
      }
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

  db.insertOrUpdate('cache', row, {
    id,
  })
}

module.exports = {
  get,
  save,
}
