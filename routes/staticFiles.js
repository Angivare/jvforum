let express = require('express')
  , cacheBusting = require('../utils/prepareCacheBusting')
  , router = express.Router()

router.get('/robots.txt', (req, res, next) => {
  res.contentType('text/plain')
  res.send([
    'User-agent: *',
    'Allow: /$',
    'Disallow: /',
  ].join("\n"))
})

router.get(`/assets/stylesheet--${cacheBusting.css.checksum}.css`, (req, res, next) => {
  res.contentType('text/css')
  res.send(cacheBusting.css.content)
})

router.get('/assets/images/:filename(*)--:checksum(*).:extension(*)', (req, res, next) => {
  res.sendFile(`${req.params.filename}.${req.params.extension}`, {root: __dirname + '/../assets/images/'})
})

module.exports = router
