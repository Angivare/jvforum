var express = require('express')
  , http = require('http')
  , parse = require('./utils/parsing')
  , fetch = require('./utils/fetching')
  , cacheBusting = require('./utils/prepareCacheBusting.js')
  , superlative = require('./utils/superlative.js')
  , config = require('./config/index.js')
  , router = express.Router()

router.get('/', (req, res, next) => {
  res.render('index', { title: 'Express' })
})

router.get('/:forumId([0-9]{1,7})/:idJvf([0-9]{1,9})-:slug([a-z0-9-]+)/:page([0-9]{1,5})?', (req, res, next) => {
  let forumId = parseInt(req.params.forumId)
    , idJvf = req.params.idJvf
    , mode = idJvf[0] == '0' ? 1 : 42
    , idLegacyOrNew = parseInt(idJvf)
    , slug = req.params.slug
    , page = req.params.page ? parseInt(req.params.page) : 1
    , urlJvc = `http://www.jeuxvideo.com/forums/${mode}-${forumId}-${idLegacyOrNew}-${page}-0-1-0-${slug}.htm`

  fetch.topic(mode, forumId, idLegacyOrNew, page, slug, (headers, body) => {
    let viewLocals = {
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

    if (!('location' in headers)) {
      let parsed = parse.topic(body)

      Object.keys(parsed).forEach(key => {
        viewLocals[key] = parsed[key]
      })
    }
    else {
      let location = headers.location
      if (headers.location.indexOf(`/forums/0-${forumId}-`) == 0) {
        viewLocals.error = 'deleted'
      }
    }

    res.render('topic2', viewLocals)
  }, (e) => {
    console.log(`error: ${e.message}`)
    res.render('error', {
      message: 'Erreur réseau',
      error: {status: 'La page n’a pas pu être récupérée depuis jeuxvideo.com.'},
    })
  })
})

router.get(`/assets/stylesheet--${cacheBusting.css.checksum}.css`, (req, res, next) => {
  res.contentType('text/css')
  res.send(cacheBusting.css.content)
})

router.get('/assets/images/:filename(*)--:checksum(*).:extension(*)', (req, res, next) => {
  res.sendFile(`${req.params.filename}.${req.params.extension}`, {root: __dirname + '/public/images/'})
})

module.exports = router
