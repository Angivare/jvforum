let express = require('express')
  , cacheBusting = require('../utils/prepareCacheBusting')
  , utils = require('../utils/utils')
  , renderView = require('../utils/renderView')
  , config = require('../config')
  , router = express.Router()

router.get(/^\/@([a-zA-Z0-9-_[\]]{3,15})$/, (req, res, next) => {
  let user = utils.parseUserCookie(req.signedCookies.user)

  if (!user) {
    return res.redirect('/')
  }

  let nicknameId = req.params[0]
  let nickname = 'Alexandre'

  res.send(renderView('profile', {
    userAgent: req.headers['user-agent'],
    googleAnalyticsId: config.googleAnalyticsId,
    timeouts: config.timeouts.client,
    refreshIntervals: config.refreshIntervals,
    cacheBusting,
    title: nickname ? nickname : 'Profil',
    csrf: req.csrfToken(),
    nickname,
  }))
})

module.exports = router
