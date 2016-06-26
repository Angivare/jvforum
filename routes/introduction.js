let express = require('express')
  , cacheBusting = require('../utils/prepareCacheBusting')
  , utils = require('../utils/utils')
  , config = require('../config')
  , router = express.Router()

router.get('/', (req, res, next) => {
  res.render('introduction', {
    googleAnalyticsId: config.googleAnalyticsId,
    cacheBusting,
  })
})

module.exports = router
