let express = require('express')
  , http = require('http')
  , parse = require('../utils/parsing')
  , fetch = require('../utils/fetching')
  , cacheBusting = require('../utils/prepareCacheBusting')
  , superlative = require('../utils/superlative')
  , config = require('../config')
  , router = express.Router()

router.get('/:forumId([0-9]{1,7})/:idJvf([0-9]{1,9})-:slug([a-z0-9-]+)/:page([0-9]{1,5})?', (req, res, next) => {
  let forumId = parseInt(req.params.forumId)
    , idJvf = req.params.idJvf
    , mode = idJvf[0] == '0' ? 1 : 42
    , idLegacyOrNew = parseInt(idJvf)
    , slug = req.params.slug
    , page = req.params.page ? parseInt(req.params.page) : 1
    , urlJvc = `http://www.jeuxvideo.com/forums/${mode}-${forumId}-${idLegacyOrNew}-${page}-0-1-0-${slug}.htm`
    , viewLocals = {
        userAgent: req.headers['user-agent'],
        googleAnalyticsId: config.googleAnalyticsId,
        cssChecksum: cacheBusting.css.checksum,
        forumId,
        idJvf,
        mode,
        idLegacyOrNew,
        slug,
        page,
        urlJvc,
        isFavorite: false,
        superlative: superlative(),
      }

  if (!idLegacyOrNew) {
    return next()
  }

  fetch.topic(mode, forumId, idLegacyOrNew, page, slug, (headers, body) => {
    if (!('location' in headers)) {
      let parsed = parse.topic(body)

      Object.keys(parsed).forEach((key) => {
        viewLocals[key] = parsed[key]
      })
    }
    else {
      let {location} = headers
        , matches
      if (location.indexOf(`/forums/0-${forumId}-`) == 0) {
        viewLocals.error = 'topicdoesNotExist'
      }
      else if (location.indexOf(`/forums/${mode}-${forumId}-${idLegacyOrNew}-1-`) == 0) {
        viewLocals.error = 'pagedoesNotExist'
      }
      else if (location == '//www.jeuxvideo.com/forums.htm') {
        viewLocals.error = '103'
      }
      else if (matches = /^\/forums\/([0-9]+)-([0-9]+)-([0-9]+)-([0-9]+)-[0-9]+-[0-9]+-[0-9]+-([0-9a-z-]+)\.htm$/.exec(location)) {
        /* Known possible cases:
         * - Topic with 42 mode redirected to 1 mode, or in reverse
         * - Topic has been moved to another forum
         * - Topic's title and its slug has been modified
         */
        let urlJvf = `/${matches[2]}/`
        if (matches[1] == 1) {
          urlJvf += '0'
        }
        urlJvf += `${matches[3]}-${matches[5]}`
        if (matches[4] != 1) {
          urlJvf += `/${matches[4]}`
        }
        res.redirect(urlJvf)
      }
      else {
        viewLocals.error = 'unknownRedirect'
        viewLocals.errorLocation = location
      }
    }

    res.render('topic', viewLocals)
  }, (e) => {
    if (e == 'timeout') {
      viewLocals.error = 'timeout'
      viewLocals.timeoutDelay = (config.timeout / 1000).toString().replace('.', ',')
    }
    else {
      viewLocals.error = 'network'
      viewLocals.errorDetail = e
    }
    res.render('topic', viewLocals)
  })
})

module.exports = router
