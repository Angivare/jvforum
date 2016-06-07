let express = require('express')
  , fetch = require('../utils/fetching')
  , parse = require('../utils/parsing')
  , router = express.Router()

router.post('/ajax/postMessage', (req, res, next) => {
  let r = {
      error: false,
      sent: req.body,
    }
    , ipAddress = req.connection.remoteAddress

  if (!req.body.message || !req.body.pathJvc) {
    r.error = 'Missing params'
    res.json(r)
    return
  }

  let {message, pathJvc} = req.body

  fetch(pathJvc, (headers, body) => {
    let form = parse.form(body)
    if (form) {
      r.form = form
    }
    else {
      r.error = 'parsing'
    }
    res.json(r)
  }, (error) => {
    r.error = error
    res.json(r)
  }, ipAddress)
})

module.exports = router
