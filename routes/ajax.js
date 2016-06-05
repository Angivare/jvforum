let express = require('express')
  , router = express.Router()

router.post('/ajax/postMessage', (req, res, next) => {
  let response = {
    error: false,
    sent: req.body,
  }
  res.json(response)
})

module.exports = router
