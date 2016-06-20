let express = require('express')
  , cacheBusting = require('../utils/prepareCacheBusting')
  , config = require('../config')
  , router = express.Router()

router.get('/', (req, res, next) => {
  res.render('introduction', {
    googleAnalyticsId: config.googleAnalyticsId,
    cacheBusting,
  })
})

module.exports = router
