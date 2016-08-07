let express = require('express')
  , http = require('http')
  , parse = require('../utils/parsing')
  , fetch = require('../utils/fetching')
  , cacheBusting = require('../utils/prepareCacheBusting')
  , renderView = require('../utils/renderView')
  , cache = require('../utils/caching')
  , date = require('../utils/date')
  , superlative = require('../utils/superlative')
  , utils = require('../utils/utils')
  , config = require('../config')
  , router = express.Router()

router.get('/:id([0-9]+)(-:slug([0-9a-z-]+))?', (req, res, next) => {
  let user = utils.parseUserCookie(req.signedCookies.user)

  if (!user) {
    return res.redirect('/')
  }

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
          csrf: req.csrfToken(),
          subforumsIds: [],
        }

    let cacheId = `${id}/1`
    cache.get(cacheId, config.timeouts.cache.forumDisplay, (topics, age) => {
      for (let i = 0; i < topics.length; i++) {
        topics[i].date = date.convertTopicList(topics[i].dateRaw)
      }

      viewLocals.cacheAge = age

      viewLocals.topics = topics
      utils.getForum(id, (content) => {
        Object.keys(content).forEach((key) => {
          viewLocals[key] = content[key]
        })
        viewLocals.title = viewLocals.name
        if (content.subforumsIds.length) {
          let forumsIdsWhichNeedTheirSlugAndName = [].concat(content.subforumsIds)
          if (content.parentId) {
            forumsIdsWhichNeedTheirSlugAndName.push(content.parentId)
          }
          utils.getForumsNamesAndSlugs(forumsIdsWhichNeedTheirSlugAndName, (content) => {
            viewLocals.forumNames = content.names
            viewLocals.forumSlugs = content.slugs
            res.send(renderView('forum', viewLocals))
          })
        }
        else {
          res.send(renderView('forum', viewLocals))
        }
      })
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
        else if (headers.statusCode == 200) {
          let parsed = parse.forum(body)

          cache.save(cacheId, parsed.topics)
          utils.saveForum(id, parsed.name, slug, parsed.isLocked, parsed.parentId, parsed.subforumsIds)

          for (let i = 0; i < parsed.topics.length; i++) {
            parsed.topics[i].date = date.convertTopicList(parsed.topics[i].dateRaw)
          }

          Object.keys(parsed).forEach((key) => {
            viewLocals[key] = parsed[key]
          })
          viewLocals.title = viewLocals.name

          if (parsed.subforumsIds.length) {
            let forumsIdsWhichNeedTheirSlugAndName = [].concat(parsed.subforumsIds)
            if (parsed.parentId) {
              forumsIdsWhichNeedTheirSlugAndName.push(parsed.parentId)
            }
            utils.getForumsNamesAndSlugs(forumsIdsWhichNeedTheirSlugAndName, (content) => {
              viewLocals.forumNames = content.names
              viewLocals.forumSlugs = content.slugs
              res.send(renderView('forum', viewLocals))
            })
          }
          else {
            res.send(renderView('forum', viewLocals))
          }
          return
        }
        else {
          viewLocals.error = 'not200'
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
