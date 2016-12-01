let express = require('express')
  , csrf = require('csurf')
  , router = express.Router()

let csrfProtection = csrf({
  cookie: true,
  ignoreMethods: [],
})

router.get('/logout', csrfProtection, (req, res, next) => {
  for (let name in req.signedCookies) {
    res.clearCookie(name)
  }
  res.redirect('/')
})

module.exports = router
