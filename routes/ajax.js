let express = require('express')
  , cheerio = require('cheerio')
  , utils = require('../utils/utils')
  , fetch = require('../utils/fetching')
  , parse = require('../utils/parsing')
  , cache = require('../utils/caching')
  , db = require('../utils/db')
  , date = require('../utils/date')
  , config = require('../config')
  , router = express.Router()

router.post('/*', (req, res, next) => {
  req.user = utils.parseUserCookie(req.signedCookies.user)
  if (!req.user && req.params[0] != 'login') {
    res.json({error: 'Déconnecté'})
    return
  }
  if (req.user) {
    req.formattedJvcCookies = `coniunctio=${req.user.jvcCookies.coniunctio}; dlrowolleh=${req.user.jvcCookies.dlrowolleh}`
  }
  next()
})

router.post('/login', (req, res, next) => {
  let r = {
      error: false,
    }
    , ipAddress = req.cf_ip

  let missingParams = false
  ;['nickname', 'password', 'captcha'].forEach((varName) => {
    if (!(varName in req.body)) {
      missingParams = true
    }
  })
  if (missingParams) {
    return res.json({error: 'Paramètres manquants'})
  }

  let {nickname, password, captcha} = req.body

  fetch({
    path: '/login',
    ipAddress,
  }, (headers, body) => {
    let form = parse.form(body)
    if (form) {
      form['login_pseudo'] = nickname
      form['login_password'] = password
      form['g-recaptcha-response'] = captcha

      let cookie = headers['set-cookie'][0].split(';')[0] // dlrowolleh
      fetch({
        path: '/login',
        ipAddress,
        cookies: cookie,
        postData: form,
      }, (headers, body) => {
        let cookies = {}
        for (let i = 0; i < headers['set-cookie'].length; i++) {
          let [name, value] = headers['set-cookie'][i].split(';')[0].split('=')
          cookies[name] = value
        }
        if ('coniunctio' in cookies) {
          r.successful = true

          function setCookieAndSendResponse(id) {
            res.cookie('user', [id, nickname, 0 /* is logged as moderator, for later use */, cookies.coniunctio, cookies.dlrowolleh].join('.'), {
              maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
              httpOnly: true,
              signed: true,
            })
            res.json(r)
            utils.logLogin(nickname, null, parseInt(cookies.coniunctio))
          }

          db.select('id', 'users', {nickname}, (results) => {
            if (results.length) {
              setCookieAndSendResponse(results[0].id)
            }
            else {
              db.insert('users', {nickname}, (results) => {
                setCookieAndSendResponse(results.insertId)
              })
            }
          })
        }
        else {
          if (matches = /<div class="bloc-erreur">([^<]+)<\/div>/.exec(body)) {
            r.error = 'Erreur lors de la connexion : ' + matches[1]
            utils.logLogin(nickname, `jvc ${matches[1]}`)
          }
          else {
            r.error = 'Erreur lors de la connexion, mais JVC n’indique vraisemblablement pas laquelle.'
            utils.logLogin(nickname, 'jvc_unknown')
          }
          res.json(r)
        }
      }, (error) => {
        if (error == 'timeout') {
          r.error = 'Timeout de JVC lors de la connexion.'
        }
        else {
          r.error = `Erreur réseau de JVF lors de la connexion. (${error}).`
        }
        res.json(r)
        utils.logLogin(nickname, `post_network ${error}`)
      })
    }
    else {
      r.error = 'JVForum n’a pas pu parser le formulaire.'
      res.json(r)
    }
  }, (error) => {
    if (error == 'timeout') {
      r.error = 'Timeout de JVC lors de la récupération du formulaire.'
    }
    else {
      r.error = `Erreur réseau de JVF lors de la récupération du formulaire. (${error}).`
    }
    res.json(r)
    utils.logLogin(nickname, `get_network ${error}`)
  })
})

router.post('/postMessage', (req, res, next) => {
  let r = {
      error: false,
    }
    , ipAddress = req.cf_ip
    , user = req.user

  let missingParams = false
  ;['message', 'forumId', 'topicMode', 'topicIdLegacyOrModern', 'topicSlug'].forEach((varName) => {
    if (!(varName in req.body)) {
      missingParams = true
    }
  })
  if (missingParams) {
    return res.json({error: 'Paramètres manquants'})
  }

  let {message, forumId, topicMode, topicIdLegacyOrModern, topicSlug} = req.body
    , pathJvc = `/forums/${topicMode}-${forumId}-${topicIdLegacyOrModern}-1-0-1-0-${topicSlug}.htm`

  message = utils.adaptPostedMessage(message, req.headers.host)

  fetch({
    path: pathJvc,
    cookies: req.formattedJvcCookies,
    ipAddress,
    timeout: config.timeouts.server.postMessageForm,
  }, (headers, body) => {
    let form = parse.form(body)
    if (form) {
      form['message_topic'] = message
      form['form_alias_rang'] = 1

      db.insert('messages_posted', {
        authorId: user.id,
        isTopic: 0,
        forumId,
        topicMode,
        topicIdLegacyOrModern,
        ipAddress,
      }, (results) => {
        let dbId = results.insertId
        fetch({
          path: pathJvc,
          cookies: req.formattedJvcCookies,
          ipAddress,
          postData: form,
          timeout: config.timeouts.server.postMessage,
        }, (headers, body) => {
          let matches
            , id
          if ('location' in headers && (matches = headers.location.match(/^\/forums\/(?:1|42)-[0-9]+-[0-9]+-[0-9]+-0-1-0-[a-z0-9-]+\.htm#post_([0-9]+)$/))) {
            id = matches[1]
            db.update('messages_posted', {messageId: id}, {id: dbId})
          }
          else {
            if ('location' in headers) {
              r.error = `La redirection renvoyée par JVC est invalide (${headers.location}).`
            }
            else if (headers.statusCode == 200) {
              if (matches = body.match(/<div class="alert-row"> (.+?) <\/div>/)) {
                let error = matches[1]
                if (error == 'Le captcha est invalide.') {
                  r.error = 'JVC demande un captcha. Repostez dans un instant.'
                }
                else {
                  r.error = `JVC a renvoyé l’erreur « ${error} » à l’envoi du message.`
                }
              }
              else {
                r.error = 'Il y a une erreur (pas de redirection de JVC), mais JVC ne précise vraisemblablement pas l’erreur.'
              }
            }
            else {
              r.error = 'JVC n’arrive pas à servir la page d’envoi.'
            }
          }
          res.json(r)
        }, (error) => {
          if (error == 'timeout') {
            r.error = 'Timeout de JVC lors de l’envoi du message. Le message a cependant peut-être été posté.'
          }
          else {
            r.error = `Erreur réseau de JVF lors de l’envoi du message. (${error}).`
          }
          res.json(r)
        })
      })
    }
    else {
      if (headers.statusCode == 200) {
        r.error = 'JVForum n’a pas pu parser le formulaire.'
      }
      else {
        r.error = 'JVC n’arrive pas à servir la page de récupération du formulaire.'
      }
      res.json(r)
    }
  }, (error) => {
    if (error == 'timeout') {
      r.error = 'Timeout de JVC lors de la récupération du formulaire.'
    }
    else {
      r.error = `Erreur réseau de JVF lors de la récupération du formulaire. (${error}).`
    }
    res.json(r)
  })
})

router.post('/refresh', (req, res, next) => {
  let r = {
      error: false,
    }

  let missingParams = false
  ;['forumId', 'topicMode', 'topicIdLegacyOrModern', 'topicSlug', 'topicPage', 'numberOfPages', 'messagesChecksums'].forEach((varName) => {
    if (!(varName in req.body)) {
      missingParams = true
    }
  })
  if (missingParams) {
    return res.json({error: 'Paramètres manquants'})
  }

  let {forumId, topicMode, topicIdLegacyOrModern, topicSlug, topicPage, numberOfPages, messagesChecksums} = req.body
    , pathJvc = `/forums/${topicMode}-${forumId}-${topicIdLegacyOrModern}-${topicPage}-0-1-0-${topicSlug}.htm`
    , idJvf = (topicMode == 1 ? '0' : '') + topicIdLegacyOrModern
    , topicIdLegacy = topicMode == 1 ? topicIdLegacyOrModern : 0
    , topicIdModern = topicMode == 42 ? topicIdLegacyOrModern : 0

  topicPage = parseInt(topicPage)
  messagesChecksums = JSON.parse(messagesChecksums)

  if (topicIdLegacyOrModern == 0) {
    return res.json({error: 'topicIdLegacyOrModern == 0'})
  }

  let cacheId = `${forumId}/${idJvf}/${topicPage}`
  utils.getTopic(topicIdModern ? `idModern = ${topicIdModern}` : `idLegacy = ${topicIdLegacy} AND forumId = ${forumId}`, (content) => {
    cache.get(cacheId, config.timeouts.cache.refresh, (messages, age) => {
      if (content.isDeleted) {
        serveTopic(null, 'deleted')
        return
      }
      content.messages = messages
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
          if (topicIdModern) {
            // The table's primary key being `idModern` we can only do this when it's not a legacy URL
            utils.saveTopic(topicIdModern, {
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
          serveTopic(null, 'redirect')
        }
        else {
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
          idLegacy: topicIdLegacy,
          forumId,
          name: content.name,
          slug: topicSlug,
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
        serveTopic(null, 'network')
      }
    })
  }

  function serveTopic(content, error) {
    if (error) {
      res.json({error})
      return
    }

    let data = {
        messages: {},
      }
      , newMessages = []
      , avatarsNicknames = []
      , paginationPages = utils.makePaginationPages(topicPage, content.numberOfPages)

    for (let i = 0; i < content.messages.length; i++) {
      let id = content.messages[i].id
      data.messages[id] = {}
      let dateConversion = date.convertMessage(content.messages[i].dateRaw)

      if (id in messagesChecksums) {
        data.messages[id].date = dateConversion.text
        data.messages[id].age = dateConversion.diff

        if (messagesChecksums[id] != content.messages[i].checksum) {
          data.messages[id].content = content.messages[i].content
          data.messages[id].checksum = content.messages[i].checksum
        }
      }
      else {
        content.messages[i].date = dateConversion.text
        content.messages[i].age = dateConversion.diff

        let nickname = content.messages[i].nickname.toLowerCase()
        if (!avatarsNicknames.includes(nickname)) {
          avatarsNicknames.push(nickname)
        }

        newMessages.push(content.messages[i])
        data.messages[id].checksum = content.messages[i].checksum
      }
    }

    let renderings = 0
    function sendJSONAfterRenderings() {
      renderings++
      if (numberOfPages != content.numberOfPages && newMessages.length) {
        if (renderings == 2) {
          res.json(data)
        }
      }
      else {
        res.json(data)
      }
    }

    if (newMessages.length == 0 && numberOfPages == content.numberOfPages) {
      res.json(data)
    }
    else if (numberOfPages != content.numberOfPages) {
      req.app.render('partials/topicPagination', {
        paginationPages,
        numberOfPages: content.numberOfPages,
        page: topicPage,
        forumId,
        idJvf,
        slug: topicSlug,
      }, (err, html) => {
        data.paginationHTML = html
        data.numberOfPages = content.numberOfPages
        sendJSONAfterRenderings()
      })
    }
    else if (newMessages.length) {
      utils.getAvatars(avatarsNicknames, (avatars) => {
        for (let nickname in avatars) {
          let url = avatars[nickname]
          for (let i = 0; i < newMessages.length; i++) {
            if (newMessages[i].nickname.toLowerCase() == nickname) {
              newMessages[i].avatar = url
            }
          }
        }

        req.app.render('partials/topicMessages', {
          messages: newMessages,
        }, (err, html) => {
          data.newMessagesHTML = html
          sendJSONAfterRenderings()
        })
      })
    }
  }
})

router.post('/syncFavorites', (req, res, next) => {
  let r = {
      error: false,
      updated: false,
    }
    , ipAddress = req.cf_ip
    , user = req.user
    , now = Math.floor(new Date() / 1000)

  db.select('updatedAt', 'favorites', {
    userId: user.id,
  }, (results) => {
    if (!results.length || results[0].updatedAt < now - config.timeouts.cache.favorites) {
      fetch.unique({
        path: '/forums.htm',
        cookies: req.formattedJvcCookies,
        ipAddress,
        timeout: config.timeouts.server.syncFavorites,
      }, `syncFavorites/${user.id}`, (headers, body) => {
        if (headers.statusCode == 200) {
          let $ = cheerio.load(body)
            , forums = []
            , topics = []

          $('.line-ellipsis[data-id]', '#liste-forums-preferes').each((index, element) => {
            let name = $('.lien-jv', element).text().trim()
              , id = $(element).data('id')
              , slug = $('.lien-jv', element).attr('href').substr(`//www.jeuxvideo.com/forums/0-${id}-0-1-0-1-0-`.length).split('.')[0]
            forums.push([`/${id}-${slug}`, name])
          })
          forums = JSON.stringify(forums)

          $('.line-ellipsis[data-id]', '#liste-sujet-prefere').each((index, element) => {
            let name = $('.lien-jv', element).text().trim()
              , urlSplit = $('.lien-jv', element).attr('href').split('/').pop().split('-')
              , mode = urlSplit[0]
              , forumId = urlSplit[1]
              , id = urlSplit[2]
              , slug = $('.lien-jv', element).attr('href').substr(`//www.jeuxvideo.com/forums/${mode}-${forumId}-${id}-1-0-1-0-`.length).split('.')[0]
            topics.push([`/${forumId}/${mode == 1 ? 0 : ''}${id}-${slug}`, name])
          })
          topics = JSON.stringify(topics)

          db.insertOrUpdate('favorites', {
            forums,
            topics,
            updatedAt: now,
          }, {
            userId: user.id,
          })

          r.updated = true
        }
        else {
          r.error = 'JVC n’arrive pas à servir la page'
        }
        res.json(r)
      }, (e) => {
        if (e == 'timeout') {
          res.json({error: 'Timeout'})
        }
        else {
          res.json({error: `Réseau. (${e})`})
        }
      })
    }
    else {
      res.json(r)
    }
  })
})

module.exports = router
