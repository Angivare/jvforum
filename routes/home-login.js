let express = require('express')
  , cacheBusting = require('../utils/prepareCacheBusting')
  , utils = require('../utils/utils')
  , renderView = require('../utils/renderView')
  , db = require('../utils/db')
  , config = require('../config')
  , router = express.Router()

router.get('/', (req, res, next) => {
  let user = utils.parseUserCookie(req.signedCookies.user)

  if (user) {
    utils.getUserFavorites(user.id, (favorites) => {
      db.select('numberOfPages', 'topics', {idModern: 39674315}, (results) => {
        let jvfOfficialTopicNumberOfPages = 1
        if (results.length) {
          jvfOfficialTopicNumberOfPages = results[0].numberOfPages
        }
        res.send(renderView('home', {
          userAgent: req.headers['user-agent'],
          googleAnalyticsId: config.googleAnalyticsId,
          timeouts: config.timeouts.client,
          refreshIntervals: config.refreshIntervals,
          cacheBusting,
          title: 'JVForum',
          favorites,
          jvfOfficialTopicNumberOfPages,
          csrf: req.csrfToken(),
        }))
      })
    })
  }
  else {
    res.render('login', {
      googleAnalyticsId: config.googleAnalyticsId,
      cacheBusting,
      csrf: req.csrfToken(),
    })
  }
})

router.get('/accueil', (req, res, next) => {
  res.redirect(301, '/')
})

module.exports = router
