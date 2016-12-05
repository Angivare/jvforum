crypto = require('crypto')

function sha1(str) {
  let shasum = crypto.createHash('sha1')
  shasum.update(str)
  return shasum.digest('hex')
}

module.exports = sha1
