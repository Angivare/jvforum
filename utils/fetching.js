let http = require('http')
  , querystring = require('querystring')
  , fs = require('fs')
  , config = require('../config')

http.globalAgent.keepAlive = true
http.globalAgent.maxSockets = config.maxSimultaneousRequests

function fetch(pathOrOptions, successCallback, failCallback) {
  let path = pathOrOptions
    , timeout = config.timeouts.server.notAuthentified
    , requestOptions = {
        hostname: 'www.jeuxvideo.com',
        headers: {
          'Cookie': 'coniunctio=cache_bypass',
        },
      }
    , postData

  if (typeof pathOrOptions == 'object') {
    requestOptions.path = pathOrOptions.path

    if (pathOrOptions.cookies) {
      requestOptions.headers['Cookie'] = pathOrOptions.cookies
    }

    if (pathOrOptions.ipAddress) {
      requestOptions.headers['X-Forwarded-For'] = pathOrOptions.ipAddress
    }

    if (pathOrOptions.postData) {
      postData = querystring.stringify(pathOrOptions.postData)

      requestOptions.method = 'POST'
      requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded'
      requestOptions.headers['Content-Length'] = Buffer.byteLength(postData)
    }

    if (pathOrOptions.timeout) {
      timeout = pathOrOptions.timeout
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

let uniquesBeingFetched = {}
  , uniquesErrors = {}

fetch.unique = (pathOrOptions, id, successCallback, failCallback) => {
  if (id in uniquesBeingFetched) {
    uniquesBeingFetched[id].push({
      successCallback,
      failCallback,
    })
    return
  }

  uniquesBeingFetched[id] = [{
    successCallback,
    failCallback,
  }]

  fetch(pathOrOptions, (headers, body) => {
    if (!(id in uniquesBeingFetched)) {
      /* This shouldn't happen, but sometimes does, for an unknown reason. We
         handle this otherwise the app crashes. When the bug happens, fail
         callbacks are called first and then success callbacks are called too,
         with an incomplete body.
      */
      fs.appendFile('debug_unique', (new Date().toISOString()) + "\r\n" + id + "\r\n" + uniquesErrors[id] + "\r\n" + body.length + "\r\n\r\n", () => {})
      return
    }
    for (let i of uniquesBeingFetched[id]) {
      i.successCallback(headers, body)
    }
    delete uniquesBeingFetched[id]
  }, (error) => {
    for (let i of uniquesBeingFetched[id]) {
      i.failCallback(error)
    }
    uniquesErrors[id] = '' + error
    delete uniquesBeingFetched[id]
  })
}

module.exports = fetch
