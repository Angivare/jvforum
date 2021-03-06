let express = require('express')
  , renderView = require('../utils/renderView')
  , config = require('../config')
  , router = express.Router()

router.get('/unsupported', (req, res, next) => {
  res.render('unsupported', {
    googleAnalyticsId: config.googleAnalyticsId,
    userAgent: req.headers['user-agent'],
  })
})

module.exports = router
