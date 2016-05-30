let express = require('express')
  , http = require('http')
  , parse = require('../utils/parsing')
  , fetch = require('../utils/fetching')
  , cacheBusting = require('../utils/prepareCacheBusting')
  , superlative = require('../utils/superlative')
  , config = require('../config')
  , router = express.Router()

router.get('/:id([0-9]+)(-:slug([0-9a-z-]+))?', (req, res, next) => {
  let id = req.params.id
    , slug = req.params.slug ? req.params.slug : '0'
    , viewLocals = {
        userAgent: req.headers['user-agent'],
        googleAnalyticsId: config.googleAnalyticsId,
        cssChecksum: cacheBusting.css.checksum,
        id,
        slug,
        isFavorite: false,
        superlative: superlative(),
      }
  
  fetch.forum(id, slug, 1, (headers, body) => {
    if (!('location' in headers)) {
    }
    else {
      let {location} = headers
        , matches
      if (location == '//www.jeuxvideo.com/forums.htm') {
        if (id == 103) {
          viewLocals.error = '103'
        }
        else {
          viewLocals.error = 'forumdoesNotExist'
        }
      }
      else if (matches = /^\/forums\/0-([0-9]+)-0-1-0-([0-9]+)-0-([0-9a-z-]+)\.htm$/.exec(location)) {
        res.redirect(`/${matches[1]}-${matches[2]}`)
      }
      else {
        viewLocals.error = 'unknownRedirect'
        viewLocals.errorLocation = location
      }
    }

    res.render('forum', viewLocals)
  }, (e) => {
    if (e == 'timeout') {
      viewLocals.error = 'timeout'
      viewLocals.timeoutDelay = (config.timeout / 1000).toString().replace('.', ',')
    }
    else {
      viewLocals.error = 'network'
      viewLocals.errorDetail = e
    }
    res.render('forum', viewLocals)
  })
})

module.exports = router
