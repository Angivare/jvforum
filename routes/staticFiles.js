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

router.get('/assets/:dir(images|scripts)/:filename(*)--:checksum(*).:extension(*)', (req, res, next) => {
  res.sendFile(`${req.params.filename}.${req.params.extension}`, {root: `${__dirname}/../assets/${req.params.dir}/`})
})

router.get('/assets/stickers/v1/:id([0-9]+)', (req, res, next) => {
  res.sendFile(`${req.params.id}`, {
    root: `${__dirname}/../assets/stickers/v1/`,
    headers: {
      'Content-Type': 'image/png',
    },
  })
})

module.exports = router
