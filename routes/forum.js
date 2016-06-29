let express = require('express')
  , http = require('http')
  , parse = require('../utils/parsing')
  , fetch = require('../utils/fetching')
  , cacheBusting = require('../utils/prepareCacheBusting')
  , renderView = require('../utils/renderView')
  , cache = require('../utils/caching')
  , superlative = require('../utils/superlative')
  , utils = require('../utils/utils')
  , config = require('../config')
  , router = express.Router()

router.get('/:id([0-9]+)(-:slug([0-9a-z-]+))?', (req, res, next) => {
  let user = utils.parseUserCookie(req.signedCookies.user)

  utils.getUserFavorites(user.id, (favorites) => {
    let id = req.params.id
      , slug = req.params.slug ? req.params.slug : '0'
      , pathJvc = `/forums/0-${id}-0-1-0-1-0-${slug}.htm`
      , viewLocals = {
          userAgent: req.headers['user-agent'],
          googleAnalyticsId: config.googleAnalyticsId,
          cacheBusting,
          timeouts: config.timeouts.client,
          refreshIntervals: config.refreshIntervals,
          id,
          slug,
          pathJvc,
          urlJvc: `http://www.jeuxvideo.com${pathJvc}`,
          isFavorite: false,
          favorites,
          superlative: superlative(),
        }

    if (!user) {
      return res.redirect('/')
    }

    let cacheId = `${id}/1`
    cache.get(cacheId, config.timeouts.cache.forumDisplay, (content, age) => {
      Object.keys(content).forEach((key) => {
        viewLocals[key] = content[key]
      })
      viewLocals.cacheAge = age
      res.send(renderView('forum', viewLocals))
    }, () => {
      fetch.unique(pathJvc, cacheId, (headers, body) => {
        if ('location' in headers) {
          let {location} = headers
            , matches
          if (location == '//www.jeuxvideo.com/forums.htm') {
            if (id == 103) {
              viewLocals.error = '103'
            }
            else {
              viewLocals.error = 'forumDoesNotExist'
            }
          }
          else if (matches = /^\/forums\/0-([0-9]+)-0-1-0-([0-9]+)-0-([0-9a-z-]+)\.htm$/.exec(location)) {
            return res.redirect(`/${matches[1]}-${matches[3]}`)
          }
          else {
            viewLocals.error = 'unknownRedirect'
            viewLocals.errorLocation = location
          }
        }
        else {
          let parsed = parse.forum(body)

          cache.save(cacheId, parsed)

          Object.keys(parsed).forEach((key) => {
            viewLocals[key] = parsed[key]
          })
        }

        res.send(renderView('forum', viewLocals))
      }, (e) => {
        if (e == 'timeout') {
          viewLocals.error = 'timeout'
        }
        else {
          viewLocals.error = 'network'
          viewLocals.errorDetail = e
        }
        res.send(renderView('forum', viewLocals))
      })
    })
  })
})

module.exports = router
