let express = require('express')
  , cacheBusting = require('../utils/prepareCacheBusting')
  , utils = require('../utils/utils')
  , fetch = require('../utils/fetching')
  , parse = require('../utils/parsing')
  , cache = require('../utils/caching')
  , date = require('../utils/date')
  , db = require('../utils/db')
  , renderView = require('../utils/renderView')
  , config = require('../config')
  , router = express.Router()

router.get(/^\/@([a-zA-Z0-9-_[\]]{3,15})$/, (req, res, next) => {
  let user = utils.parseUserCookie(req.signedCookies.user)

  if (!user) {
    return res.redirect('/')
  }

  let viewLocals = {
        userAgent: req.headers['user-agent'],
        googleAnalyticsId: config.googleAnalyticsId,
        timeouts: config.timeouts.client,
        refreshIntervals: config.refreshIntervals,
        cacheBusting,
        title: 'Profil',
        csrf: req.csrfToken(),
      }

  function fetchLudicrousInformations() {
    data.messagesIn2017 = false
    if (config.ludicrous && data.nickname) {
      db.query('select count(*) from messages where nickname = ? and postedAt >= 1483225200', [data.nickname], (results) => {
        data.messagesIn2017 = results[0]['count(*)']

        db.select('createdAt, vagueness', 'nicknames_registration_date', {nickname: data.nickname}, (results) => {
          if (results.length) {
            let {createdAt, vagueness} = results[0]
            if (vagueness == 0) {
              data.registrationTimestamp = createdAt
            }
            else {
              if (!('registrationTimestamp' in data)) {
                data.registrationTimestamp = createdAt
              }
              data.registrationVagueness = vagueness
            }
          }
          sendResponse()
        })
      })
    }
    else {
      sendResponse()
    }
  }

  function sendResponse() {
    for (let key in data) {
      viewLocals[key] = data[key]
    }

    if (viewLocals.nickname) {
      viewLocals.title = viewLocals.nickname
    }

    if (viewLocals.registrationTimestamp) {
      let {relativeDays, absoluteYear, absoluteDate, absoluteHour} = date.convertProfileTimestampToDate(viewLocals.registrationTimestamp)
      viewLocals.registrationDays = relativeDays
      viewLocals.registrationYear = absoluteYear
      viewLocals.registrationDate = absoluteDate
      if (!data.registrationVagueness) {
        viewLocals.registrationHour = absoluteHour
      }
    }

    if (viewLocals.message && viewLocals.messages !== false) {
      viewLocals.messages = viewLocals.messages.toLocaleString().replace(/,/g, ' ')
    }

    if (viewLocals.messagesIn2017 !== false) {
      viewLocals.messagesIn2017 = viewLocals.messagesIn2017.toLocaleString().replace(/,/g, ' ')
    }

    if (viewLocals.registrationDays) {
      viewLocals.registrationDays = viewLocals.registrationDays.toLocaleString().replace(/,/g, ' ')
    }

    res.set('Cache-Control', 'max-age=10, private')
    res.send(renderView('profile', viewLocals))
  }

  let nicknameLowerCase = req.params[0].toLowerCase()
    , cacheId = `@${nicknameLowerCase}`
    , data = {}
  cache.get(cacheId, config.timeouts.cache.forumDisplay, (cacheData, age) => {
    data = cacheData
    fetchLudicrousInformations()
  }, () => {
    fetch.unique(`/profil/${nicknameLowerCase}?mode=infos`, cacheId, (headers, body) => {
      if (headers.statusCode == 404) {
        data.exists = false
        cache.save(cacheId, data)
      }
      else if (headers.statusCode == 200) {
        data = parse.profile(body)
        data.exists = true
        cache.save(cacheId, data)
      }
      else {
        viewLocals.error = headers.statusCode
      }
      fetchLudicrousInformations()
    }, (e) => {
      if (e == 'timeout') {
        viewLocals.error = 'timeout'
      }
      else {
        viewLocals.error = 'network'
        viewLocals.errorDetail = e
      }
      sendResponse()
    })
  })
})

module.exports = router
