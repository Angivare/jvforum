let express = require('express')
  , cacheBusting = require('../utils/prepareCacheBusting')
  , utils = require('../utils/utils')
  , renderView = require('../utils/renderView')
  , config = require('../config')
  , router = express.Router()

router.get('/forums', (req, res, next) => {
  let user = utils.parseUserCookie(req.signedCookies.user)

  if (!user) {
    return res.redirect('/')
  }

  res.send(renderView('forum_search', {
    userAgent: req.headers['user-agent'],
    googleAnalyticsId: config.googleAnalyticsId,
    timeouts: config.timeouts.client,
    refreshIntervals: config.refreshIntervals,
    cacheBusting,
    title: 'Rechercher un forum',
    csrf: req.csrfToken(),
  }))
})

module.exports = router
