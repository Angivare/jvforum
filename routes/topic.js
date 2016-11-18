let express = require('express')
  , fs = require('fs')
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
      , idModern = mode == 42 ? idLegacyOrModern : 0
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
    utils.getTopic(idModern ? `idModern = ${idModern}` : `idLegacy = ${idLegacy} AND forumId = ${forumId}`, (content) => {
      if (content.isDeleted) {
        serveTopic(null, 'deleted')
        return
      }
      cache.get(cacheId, config.timeouts.topicDisplay, (messages, age) => {
        content.messages = messages
        viewLocals.cacheAge = age
        serveTopic(content)
      }, () => {
        fetchTopic()
      })
    }, () => {
      fetchTopic()
    })

    function fetchTopic() {
      fetch.unique(pathJvc, cacheId, (headers, body) => {
        if ('location' in headers) {
          let {location} = headers
            , matches
          if (location.indexOf(`/forums/0-${forumId}-`) == 0) {
            if (idModern) {
              // The table's primary key being `idModern` we can only do this when it's not a legacy URL
              utils.saveTopic(idModern, {
                forumId,
                isDeleted: 1,
              })
            }
            serveTopic(null, 'deleted')
          }
          else if (location == '//www.jeuxvideo.com/forums.htm') {
            serveTopic(null, '103')
          }
          else if (matches = /^\/forums\/([0-9]+)-([0-9]+)-([0-9]+)-([0-9]+)-[0-9]+-[0-9]+-[0-9]+-([0-9a-z-]+)\.htm$/.exec(location)) {
            /* Known possible cases:
             * - Topic with 42 mode redirected to 1 mode, or in reverse
             * - Topic has been moved to another forum
             * - Topic's title and its slug has been modified
             * - The page we try to access doesn't exist and JVC redirects to the first page
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
            viewLocals.errorLocation = location
            serveTopic(null, 'unknownRedirect')
          }
        }
        else if (headers.statusCode == 404) {
          serveTopic(null, 'doesNotExist')
        }
        else if (headers.statusCode != 200) {
          serveTopic(null, 'not200')
        }
        else {
          let content = parse.topic(body)
          cache.save(cacheId, content.messages)
          utils.saveTopic(content.idModern, {
            idLegacy,
            forumId,
            name: content.name,
            slug,
            numberOfPages: content.numberOfPages,
            isDeleted: 0,
            isLocked: content.isLocked,
            lockRationale: content.lockRationale,
          })
          serveTopic(content)
        }
      }, (error) => {
        if (error == 'timeout') {
          serveTopic(null, 'timeout')
        }
        else {
          viewLocals.errorDetail = error
          serveTopic(null, 'network')
        }
      })
    }

    function serveTopic(content, error) {
      utils.getForumsNamesAndSlugs([forumId], (content2) => {
        if (forumId in content2.names) {
          viewLocals.forumName = content2.names[forumId]
          viewLocals.forumSlug = content2.slugs[forumId]
        }

        if (error) {
          viewLocals.error = error
          viewLocals.numberOfPages = 0
          res.send(renderView('topic', viewLocals))
          return
        }

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
        viewLocals.paginationPages = utils.makePaginationPages(page, content.numberOfPages)

        if (nicknames.length == 0) {
          res.send(renderView('topic', viewLocals))
          fs.appendFile('debug-no-nicknames', `${new Date}\n${forumId}/${idJvf}-${slug}/${page}\n\n`)
        }
        else {
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
      })
    }
  })
})

module.exports = router
