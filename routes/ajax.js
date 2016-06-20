let express = require('express')
  , utils = require('../utils/utils')
  , fetch = require('../utils/fetching')
  , parse = require('../utils/parsing')
  , cache = require('../utils/caching')
  , db = require('../utils/db')
  , date = require('../utils/date')
  , config = require('../config')
  , router = express.Router()

router.post('/*', (req, res, next) => {
  if (!('origin' in req.headers) || req.headers.origin != `${req.protocol}://${req.headers.host}`) {
    res.json({error: 'Bad Origin'})
    return
  }
  next()
})

router.post('/login', (req, res, next) => {
  let r = {
      error: false,
    }
    , ipAddress = req.connection.remoteAddress

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
            res.cookie('id', [id, nickname, 0 /* is logged as moderator, for later use */, cookies.coniunctio, cookies.dlrowolleh].join('-'), {
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
    , ipAddress = req.connection.remoteAddress

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
    cookies: config.cookies,
    ipAddress,
  }, (headers, body) => {
    let form = parse.form(body)
    if (form) {
      form['message_topic'] = message
      form['form_alias_rang'] = 1

      db.insert('messages_posted', {
        authorId: 0,
        isTopic: 0,
        forumId,
        topicMode,
        topicIdLegacyOrModern,
        ipAddress,
      }, (results) => {
        let dbId = results.insertId
        fetch({
          path: pathJvc,
          cookies: config.cookies,
          ipAddress,
          postData: form,
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
            else {
              if (matches = body.match(/<div class="alert-row"> (.+?) <\/div>/)) {
                let error = matches[1]
                if (error == 'Le captcha est invalide.') {
                  r.error = 'JVC demande un captcha. Retentez de poster dans un instant.'
                }
                else {
                  r.error = `JVC a renvoyé l’erreur « ${error} » à l’envoi du message.`
                }
              }
              else {
                r.error = 'Il y a une erreur (pas de redirection de JVC), mais JVC ne précise vraisemblablement pas l’erreur.'
              }
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
  })
})

router.post('/refresh', (req, res, next) => {
  let r = {
      error: false,
    }

  let missingParams = false
  ;['forumId', 'topicMode', 'topicIdLegacyOrModern', 'topicSlug', 'topicPage', 'lastPage', 'messagesChecksums'].forEach((varName) => {
    if (!(varName in req.body)) {
      missingParams = true
    }
  })
  if (missingParams) {
    return res.json({error: 'Paramètres manquants'})
  }

  let {forumId, topicMode, topicIdLegacyOrModern, topicSlug, topicPage, lastPage, messagesChecksums} = req.body
    , pathJvc = `/forums/${topicMode}-${forumId}-${topicIdLegacyOrModern}-${topicPage}-0-1-0-${topicSlug}.htm`
    , idJvf = (topicMode == 1 ? '0' : '') + topicIdLegacyOrModern

  messagesChecksums = JSON.parse(messagesChecksums)

  if (topicIdLegacyOrModern == 0) {
    return res.json({error: 'topicIdLegacyOrModern == 0'})
  }

  function serveContent(content) {
    let data = {
        messages: {},
      }
      , newMessages = []

    for (let i = 0; i < content.messages.length; i++) {
      let id = content.messages[i].id
      data.messages[id] = {}

      if (id in messagesChecksums) {
        let dateConversion = date.convertMessage(content.messages[i].dateRaw)
        data.messages[id].date = dateConversion.text
        data.messages[id].age = dateConversion.diff

        if (messagesChecksums[id] != content.messages[i].checksum) {
          data.messages[id].content = content.messages[i].content
          data.messages[id].checksum = content.messages[i].checksum
        }
      }
      else {
        newMessages.push(content.messages[i])
        data.messages[id].checksum = content.messages[i].checksum
      }
    }

    let renderings = 0
    function sendJSONAfterRenderings() {
      renderings++
      if (lastPage != content.lastPage && newMessages.length) {
        if (renderings == 2) {
          res.json(data)
        }
      }
      else {
        res.json(data)
      }
    }

    if (newMessages.length == 0 && lastPage == content.lastPage) {
      res.json(data)
    }
    else if (lastPage != content.lastPage) {
      req.app.render('includes/topicPagination', {
        paginationPages: content.paginationPages,
        lastPage: content.lastPage,
        page: topicPage,
        forumId,
        idJvf,
        slug: topicSlug,
      }, (err, html) => {
        data.paginationHTML = html
        data.lastPage = content.lastPage
        sendJSONAfterRenderings()
      })
    }
    else if (newMessages.length) {
      req.app.render('includes/topicMessages', {
        messages: newMessages,
      }, (err, html) => {
        data.newMessagesHTML = html
        sendJSONAfterRenderings()
      })
    }
  }

  let cacheId = `${forumId}/${idJvf}/${topicPage}`
  cache.get(cacheId, config.timeouts.cache.refresh, (content, age) => {
    serveContent(content)
  }, () => {
    fetch.unique(pathJvc, cacheId, (headers, body) => {
      if ('location' in headers) {
        let {location} = headers
          , matches
        if (location.indexOf(`/forums/0-${forumId}-`) == 0) {
          res.json({error: 'Topic supprimé'})
        }
        else if (location == '//www.jeuxvideo.com/forums.htm') {
          res.json({error: 'Topic privé'})
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
          res.json({error: 'Redirection'})
        }
        else {
          res.json({error: `Redirection inconnue (${location})`})
        }
      }
      else if (headers.statusCode == 404) {
        res.json({error: 'Topic inexistant'})
      }
      else {
        let parsed = parse.topic(body)
        serveContent(parsed)
        cache.save(cacheId, parsed)
      }
    }, (e) => {
      if (e == 'timeout') {
        res.json({error: 'Timeout'})
      }
      else {
        res.json({error: `Réseau. (${e})`})
      }
    })
  })
})

module.exports = router
