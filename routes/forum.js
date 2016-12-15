let express = require('express')
  , http = require('http')
  , db = require('../utils/db')
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

router.get('/:id([0-9]+)(-:slug([0-9a-z-]+))?(/:page([0-9]+))?', (req, res, next) => {
  let user = utils.parseUserCookie(req.signedCookies.user)

  if (!user) {
    return res.redirect('/')
  }

  utils.getUserFavorites(user.id, (favorites) => {
    let id = req.params.id
      , slug = req.params.slug ? req.params.slug : '0'
      , page = req.params.page ? parseInt(req.params.page) : 1
      , index = (page - 1) * 25 + 1
      , pathJvc = `/forums/0-${id}-0-1-0-${index}-0-${slug}.htm`
      , viewLocals = {
          userAgent: req.headers['user-agent'],
          googleAnalyticsId: config.googleAnalyticsId,
          cacheBusting,
          timeouts: config.timeouts.client,
          refreshIntervals: config.refreshIntervals,
          id,
          slug,
          page,
          pathJvc,
          urlJvc: `http://www.jeuxvideo.com${pathJvc}`,
          isFavorite: utils.isInFavorites(`/${id}-`, favorites, 'forums'),
          favorites,
          superlative: superlative(),
          csrf: req.csrfToken(),
          subforumsIds: [],
        }

    function getTopicsPositionsAndSend() {
      res.set('Cache-Control', 'max-age=1, private')

      if ('topics' in viewLocals && viewLocals.topics.length) {
        let topicsIds = []
          , positions = {}
        viewLocals.topics.forEach((topic) => {
          topicsIds.push(topic.id)
        })
        db.query('SELECT topicIdModern, messageId, answersCount FROM topics_positions WHERE userId = ? AND topicIdModern IN (?)', [
          user.id,
          topicsIds,
        ], (results) => {
          results.forEach((row) => {
            positions[row.topicIdModern] = {
              messageId: row.messageId,
              answersCount: row.answersCount,
            }
          })

          viewLocals.topics.forEach((topic) => {
            topic.position = ''
            topic.hasBeenVisited = false
            topic.hasNewMessages = false
            if (!(topic.id in positions)) {
              return
            }
            topic.hasBeenVisited = true
            let position = positions[topic.id]
              , positionPage = 1 + Math.floor(position.answersCount / 20)
              , actualPage = 1 + Math.floor(topic.answerCount / 20)

            if (topic.answerCount > position.answersCount) {
              topic.hasNewMessages = true
              if (actualPage >= positionPage + 2) {
                topic.position = `/${actualPage}`
              }
              else {
                if (position.answersCount % 20 == 19) {
                  topic.position = `/${positionPage + 1}`
                }
                else {
                  if (positionPage > 1) {
                    topic.position = `/${positionPage}`
                  }
                  topic.position += `#after${position.messageId}`
                }
              }
            }
            else {
              if (positionPage > 1) {
                topic.position = `/${positionPage}`
              }
              topic.position += `#after${position.messageId}`
            }
          })

          res.send(renderView('forum', viewLocals))
        })
      }
      else {
        res.send(renderView('forum', viewLocals))
      }
    }

    let cacheId = `${id}/${page}`
    cache.get(cacheId, config.timeouts.cache.forumDisplay, (data, age) => {
      let {topics, hasNextPage} = data
      for (let i = 0; i < topics.length; i++) {
        topics[i].date = date.convertTopicList(topics[i].dateRaw)
      }

      viewLocals.cacheAge = age

      viewLocals.topics = topics
      viewLocals.hasNextPage = hasNextPage
      utils.getForum(id, (content) => {
        Object.keys(content).forEach((key) => {
          viewLocals[key] = content[key]
        })
        if (content.subforumsIds.length) {
          let forumsIdsWhichNeedTheirSlugAndName = [].concat(content.subforumsIds)
          if (content.parentId) {
            forumsIdsWhichNeedTheirSlugAndName.push(content.parentId)
          }
          utils.getForumsNamesAndSlugs(forumsIdsWhichNeedTheirSlugAndName, (content) => {
            viewLocals.forumNames = content.names
            viewLocals.forumSlugs = content.slugs
            getTopicsPositionsAndSend()
          })
        }
        else {
          getTopicsPositionsAndSend()
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

          cache.save(cacheId, {
            topics: parsed.topics,
            hasNextPage: parsed.hasNextPage,
          })
          utils.saveForum(id, parsed.name, slug, parsed.isLocked, parsed.parentId, parsed.subforumsIds)

          for (let i = 0; i < parsed.topics.length; i++) {
            parsed.topics[i].date = date.convertTopicList(parsed.topics[i].dateRaw)
          }

          Object.keys(parsed).forEach((key) => {
            viewLocals[key] = parsed[key]
          })

          if (parsed.subforumsIds.length) {
            let forumsIdsWhichNeedTheirSlugAndName = [].concat(parsed.subforumsIds)
            if (parsed.parentId) {
              forumsIdsWhichNeedTheirSlugAndName.push(parsed.parentId)
            }
            utils.getForumsNamesAndSlugs(forumsIdsWhichNeedTheirSlugAndName, (content) => {
              viewLocals.forumNames = content.names
              viewLocals.forumSlugs = content.slugs
              getTopicsPositionsAndSend()
            })
          }
          else {
            getTopicsPositionsAndSend()
          }
          return
        }
        else {
          viewLocals.error = headers.statusCode
        }

        getTopicsPositionsAndSend()
      }, (e) => {
        if (e == 'timeout') {
          viewLocals.error = 'timeout'
        }
        else {
          viewLocals.error = 'network'
          viewLocals.errorDetail = e
        }
        getTopicsPositionsAndSend()
      })
    })
  })
})

module.exports = router
