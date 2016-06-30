let express = require('express')
  , cacheBusting = require('../utils/prepareCacheBusting')
  , utils = require('../utils/utils')
  , renderView = require('../utils/renderView')
  , config = require('../config')
  , router = express.Router()

router.get('/', (req, res, next) => {
  let user = utils.parseUserCookie(req.signedCookies.user)

  if (user) {
    utils.getUserFavorites(user.id, (favorites) => {
      res.send(renderView('home', {
        userAgent: req.headers['user-agent'],
        googleAnalyticsId: config.googleAnalyticsId,
        timeouts: config.timeouts.client,
        refreshIntervals: config.refreshIntervals,
        cacheBusting,
        title: 'JVForum',
        favorites,
        csrf: req.csrfToken(),
      }))
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

module.exports = router
