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

    if (pathOrOptions.hostname) {
      requestOptions.hostname = pathOrOptions.hostname
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
    let bodyBuffer = Buffer.alloc(0)
    res.on('data', (chunk) => {
      bodyBuffer = Buffer.concat([bodyBuffer, chunk])
    })
    res.on('end', () => {
      if (gotAnError) {
        return
      }
      let headers = res.headers
        , body = bodyBuffer.toString()
      headers.statusCode = res.statusCode
      successCallback(headers, body)
    })
  })

  let gotAnError = false

  function errorListener(e) {
    gotAnError = true // Not sure if that's needed
    clearTimeout(timeoutID)

    failCallback(e)
  }
  request.on('error', errorListener)

  let timeoutID = request.setTimeout(timeout, () => {
    gotAnError = true
    request.removeListener('error', errorListener)
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

fetch.reconfigure = (configFile) => {
  config = require(configFile)
  http.globalAgent.maxSockets = config.maxSimultaneousRequests
}

module.exports = fetch
