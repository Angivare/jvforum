let express = require('express')
  , http = require('http')
  , parse = require('../utils/parsing')
  , fetch = require('../utils/fetching')
  , cacheBusting = require('../utils/prepareCacheBusting')
  , renderView = require('../utils/renderView')
  , superlative = require('../utils/superlative')
  , cache = require('../utils/caching')
  , date = require('../utils/date')
  , utils = require('../utils/utils')
  , config = require('../config')
  , router = express.Router()

router.get('/:forumId([0-9]{1,7})/:idJvf([0-9]{1,10})-:slug([a-z0-9-]+)/:page([0-9]{1,5})?', (req, res, next) => {
  let user = utils.parseUserCookie(req.signedCookies.user)

  if (!user) {
    return res.redirect('/')
  }

  utils.getUserFavorites(user.id, (favorites) => {
    let forumId = parseInt(req.params.forumId)
      , idJvf = req.params.idJvf
      , mode = idJvf[0] == '0' ? 1 : 42
      , idLegacyOrModern = parseInt(idJvf)
      , idLegacy = mode == 1 ? idLegacyOrModern : 0
      , slug = req.params.slug
      , page = req.params.page ? parseInt(req.params.page) : 1
      , pathJvc = `/forums/${mode}-${forumId}-${idLegacyOrModern}-${page}-0-1-0-${slug}.htm`
      , viewLocals = {
          userAgent: req.headers['user-agent'],
          googleAnalyticsId: config.googleAnalyticsId,
          cacheBusting,
          timeouts: config.timeouts.client,
          refreshIntervals: config.refreshIntervals,
          forumId,
          idJvf,
          mode,
          idLegacyOrModern,
          slug,
          page,
          pathJvc,
          urlJvc: `http://www.jeuxvideo.com${pathJvc}`,
          isFavorite: false,
          favorites,
          superlative: superlative(),
          cacheAge: 0,
          csrf: req.csrfToken(),
        }

    if (idLegacyOrModern == 0) {
      return next()
    }

    let cacheId = `${forumId}/${idJvf}/${page}`
    cache.get(cacheId, config.timeouts.topicDisplay, (content, age) => {
      let nicknames = []
      for (let i = 0; i < content.messages.length; i++) {
        let dateConversion = date.convertMessage(content.messages[i].dateRaw)
        content.messages[i].date = dateConversion.text
        content.messages[i].age = dateConversion.diff

        let nickname = content.messages[i].nickname.toLowerCase()
        if (!nicknames.includes(nickname)) {
          nicknames.push(nickname)
        }
      }

      Object.keys(content).forEach((key) => {
        viewLocals[key] = content[key]
      })
      viewLocals.title = viewLocals.name

      viewLocals.cacheAge = age

      if (nicknames.length) {
        utils.getAvatars(nicknames, (avatars) => {
          for (let nickname in avatars) {
            let url = avatars[nickname]
            for (let i = 0; i < viewLocals.messages.length; i++) {
              if (viewLocals.messages[i].nickname.toLowerCase() == nickname) {
                viewLocals.messages[i].avatar = url
              }
            }
          }
          res.send(renderView('topic', viewLocals))
        })
      }
      else {
        res.send(renderView('topic', viewLocals))
      }
    }, () => {
      fetch.unique(pathJvc, cacheId, (headers, body) => {
        if ('location' in headers) {
          let {location} = headers
            , matches
          if (location.indexOf(`/forums/0-${forumId}-`) == 0) {
            viewLocals.error = 'deleted'
          }
          else if (location == '//www.jeuxvideo.com/forums.htm') {
            viewLocals.error = '103'
          }
          else if (matches = /^\/forums\/([0-9]+)-([0-9]+)-([0-9]+)-([0-9]+)-[0-9]+-[0-9]+-[0-9]+-([0-9a-z-]+)\.htm$/.exec(location)) {
            /* Known possible cases:
             * - Topic with 42 mode redirected to 1 mode, or in reverse
             * - Topic has been moved to another forum
             * - Topic's title and its slug has been modified
             * - The page we try to access doesn't exists and JVC redirects to the first one
             */
            let urlJvf = `/${matches[2]}/`
            if (matches[1] == 1) {
              urlJvf += '0'
            }
            urlJvf += `${matches[3]}-${matches[5]}`
            if (matches[4] != 1) {
              urlJvf += `/${matches[4]}`
            }
            return res.redirect(urlJvf)
          }
          else {
            viewLocals.error = 'unknownRedirect'
            viewLocals.errorLocation = location
          }
        }
        else if (headers.statusCode == 404) {
          viewLocals.error = 'doesNotExist'
        }
        else if (headers.statusCode == 200) {
          let parsed = parse.topic(body)

          cache.save(cacheId, parsed)
          utils.saveTopic(parsed.idModern, idLegacy, forumId, parsed.name, slug, parsed.lastPage, 0, parsed.isLocked, parsed.lockRationale)

          let nicknames = []
          for (let i = 0; i < parsed.messages.length; i++) {
            let dateConversion = date.convertMessage(parsed.messages[i].dateRaw)
            parsed.messages[i].date = dateConversion.text
            parsed.messages[i].age = dateConversion.diff

            let nickname = parsed.messages[i].nickname.toLowerCase()
            if (!nicknames.includes(nickname)) {
              nicknames.push(nickname)
            }
          }

          Object.keys(parsed).forEach((key) => {
            viewLocals[key] = parsed[key]
          })
          viewLocals.title = viewLocals.name

          if (nicknames.length) {
            utils.getAvatars(nicknames, (avatars) => {
              for (let nickname in avatars) {
                let url = avatars[nickname]
                for (let i = 0; i < viewLocals.messages.length; i++) {
                  if (viewLocals.messages[i].nickname.toLowerCase() == nickname) {
                    viewLocals.messages[i].avatar = url
                  }
                }
              }
              res.send(renderView('topic', viewLocals))
            })
            return
          }
        }
        else {
          viewLocals.error = 'not200'
        }

        res.send(renderView('topic', viewLocals))
      }, (e) => {
        if (e == 'timeout') {
          viewLocals.error = 'timeout'
        }
        else {
          viewLocals.error = 'network'
          viewLocals.errorDetail = e
        }
        res.send(renderView('topic', viewLocals))
      })
    })
  })
})

module.exports = router
