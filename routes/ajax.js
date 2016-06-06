let express = require('express')
  , fetch = require('../utils/fetching')
  , parse = require('../utils/parsing')
  , router = express.Router()

function getForm(pathJvc, successCallback, failCallback) {
  fetch(pathJvc, (headers, body) => {
    let parsed = parse.form(body)
    if (parsed) {
      successCallback(parsed)
    }
    else {
      failCallback('parsing')
    }
  }, failCallback)
}

router.post('/ajax/postMessage', (req, res, next) => {
  let r = {
    error: false,
    sent: req.body,
  }

  if (!req.body.message || !req.body.pathJvc) {
    r.error = 'Missing params'
    res.json(r)
    return
  }

  let {message, pathJvc} = req.body

  getForm(pathJvc, () => {
    res.json(r)
  }, (error) => {
    r.error = error
    res.json(r)
  })
})

module.exports = router
