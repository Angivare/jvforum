let express = require('express')
  , router = express.Router()

router.post('/ajax/postMessage', (req, res, next) => {
  res.json(req.body)
})

module.exports = router
