let express = require('express')
  , cacheBusting = require('../utils/prepareCacheBusting')
  , utils = require('../utils/utils')
  , renderView = require('../utils/renderView')
  , config = require('../config')
  , stickers = require('../utils/stickers')
  , router = express.Router()

router.get('/stickers', (req, res, next) => {
  let user = utils.parseUserCookie(req.signedCookies.user)

  if (!user) {
    return res.redirect('/')
  }

  let packs = {}
  for (let stickerId in stickers.packFromId) {
    stickerId = parseInt(stickerId)
    let packId = stickers.packFromId[stickerId]
    if (!(packId in packs)) {
      packs[packId] = []
    }
    packs[packId].push(stickerId)
  }

  res.send(renderView('stickers', {
    userAgent: req.headers['user-agent'],
    googleAnalyticsId: config.googleAnalyticsId,
    timeouts: config.timeouts.client,
    refreshIntervals: config.refreshIntervals,
    cacheBusting,
    title: 'Stickers',
    packs,
    csrf: req.csrfToken(),
  }))
})

module.exports = router
