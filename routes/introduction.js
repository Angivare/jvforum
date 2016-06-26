let express = require('express')
  , cacheBusting = require('../utils/prepareCacheBusting')
  , utils = require('../utils/utils')
  , config = require('../config')
  , router = express.Router()

router.get('/', (req, res, next) => {
  let start = Date.now()
  res.render('introduction', {
    googleAnalyticsId: config.googleAnalyticsId,
    cacheBusting,
  }, (err, html) => {
    console.log((Date.now() - start) / 1000)
    res.send(html)
  })
})

module.exports = router
