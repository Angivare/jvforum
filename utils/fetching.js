let http = require('http')
, config = require('../config')

http.globalAgent.keepAlive = true
http.globalAgent.maxSockets = 30

function fetch(pathOrOptions, successCallback, failCallback) {
  let path = pathOrOptions
    , asAuthentified = false
    , timeout = config.timeouts.server.notAuthentified
    , headers = {
        'Cookie': 'coniunctio=cache_bypass',
      }

  if (typeof pathOrOptions == 'object') {
    path = pathOrOptions.path
    if (pathOrOptions.asAuthentified) {
      asAuthentified = pathOrOptions.asAuthentified
      headers = {
        'Cookie': config.cookies,
        'X-Forwarded-For': asAuthentified,
      }
    }
  }

  let request = http.request({
    hostname: 'www.jeuxvideo.com',
    path,
    headers,
  }, (res) => {
    let body = ''
    res.on('data', (chunk) => {
      body += chunk
    })
    res.on('end', () => {
      let headers = res.headers
      headers.statusCode = res.statusCode
      successCallback(headers, body)
    })
  })

  request.on('error', failCallback)

  request.setTimeout(timeout, () => {
    failCallback('timeout')
  })

  request.end()
}

module.exports = fetch
