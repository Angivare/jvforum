let http = require('http')
, querystring = require('querystring')
, config = require('../config')

http.globalAgent.keepAlive = true
http.globalAgent.maxSockets = 30

function fetch(pathOrOptions, successCallback, failCallback) {
  let path = pathOrOptions
    , asAuthentified = false
    , timeout = config.timeouts.server.notAuthentified
    , requestOptions = {
        hostname: 'www.jeuxvideo.com',
        headers: {
          'Cookie': 'coniunctio=cache_bypass',
        }
      }
    , postData

  if (typeof pathOrOptions == 'object') {
    requestOptions.path = pathOrOptions.path

    if (pathOrOptions.asAuthentified) {
      asAuthentified = pathOrOptions.asAuthentified
      requestOptions.headers = {
        'Cookie': config.cookies,
        'X-Forwarded-For': asAuthentified,
      }
    }

    if (pathOrOptions.postData) {
      postData = querystring.stringify(pathOrOptions.postData)

      requestOptions.method = 'POST'
      requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded'
      requestOptions.headers['Content-Length'] = Buffer.byteLength(postData)
    }
  }
  else {
    requestOptions.path = pathOrOptions
  }

  let request = http.request(requestOptions, (res) => {
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
    request.removeListener('error', failCallback)
    request.on('error', (e) => {})
    request.abort()

    failCallback('timeout')
  })

  if (postData) {
    request.write(postData)
  }

  request.end()
}

module.exports = fetch
