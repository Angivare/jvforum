let express = require('express')
  , utils = require('../utils/utils')
  , fetch = require('../utils/fetching')
  , parse = require('../utils/parsing')
  , db = require('../utils/db')
  , router = express.Router()

router.post('/*', (req, res, next) => {
  if (!('origin' in req.headers) || req.headers.origin != `${req.protocol}://${req.headers.host}`) {
    res.json({error: 'Bad Origin'})
    return
  }
  next()
})

router.post('/postMessage', (req, res, next) => {
  let r = {
      error: false,
    }
    , ipAddress = req.connection.remoteAddress

  ;['message', 'forumId', 'topicMode', 'topicIdLegacyOrModern', 'topicSlug'].forEach((varName) => {
    if (!(varName in req.body)) {
      r.error = 'Paramètres manquants'
      res.json(r)
      return
    }
  })
  let {message, forumId, topicMode, topicIdLegacyOrModern, topicSlug} = req.body
    , pathJvc = `/forums/${topicMode}-${forumId}-${topicIdLegacyOrModern}-1-0-1-0-${topicSlug}.htm`

  message = utils.adaptPostedMessage(message, req.headers.host)

  fetch({
    path: pathJvc,
    asAuthentified: ipAddress,
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
          asAuthentified: ipAddress,
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

module.exports = router
