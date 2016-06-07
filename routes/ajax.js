let express = require('express')
  , fetch = require('../utils/fetching')
  , parse = require('../utils/parsing')
  , router = express.Router()

router.post('/ajax/postMessage', (req, res, next) => {
  let r = {
      error: false,
    }
    , ipAddress = req.connection.remoteAddress

  if (!req.body.message || !req.body.pathJvc) {
    r.error = 'Paramètres manquants'
    res.json(r)
    return
  }

  let {message, pathJvc} = req.body

  fetch({
    path: pathJvc,
    asAuthentified: ipAddress,
  }, (headers, body) => {
    let form = parse.form(body)
    if (form) {
      form['message_topic'] = message
      form['form_alias_rang'] = 1

      fetch({
        path: pathJvc,
        asAuthentified: ipAddress,
        postData: form,
      }, (headers, body) => {
        let matches
        if (!('location' in headers) || !(matches = headers.location.match(/^\/forums\/(?:1|42)-[0-9]+-[0-9]+-[0-9]+-0-1-0-[a-z0-9-]+\.htm#post_([0-9]+)$/))) {
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
          r.error = error
        }
        res.json(r)
      })
    }
    else {
      r.error = 'JVForum n’a pas pu parser le formulaire de post.'
      res.json(r)
    }
  }, (error) => {
    if (error == 'timeout') {
      r.error = 'Timeout de JVC lors de la récupération du formulaire de post.'
    }
    else {
      r.error = error
    }
    res.json(r)
  })
})

module.exports = router
