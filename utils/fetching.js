let http = require('http')
  , https = require('https')
  , querystring = require('querystring')
  , fs = require('fs')
  , config = require('../config')

http.globalAgent.keepAlive = true
http.globalAgent.maxSockets = config.maxSimultaneousRequests

https.globalAgent.keepAlive = true
https.globalAgent.maxSockets = config.maxSimultaneousRequestsHTTPS

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
    , secure = false

  if (typeof pathOrOptions == 'object') {
    requestOptions.path = pathOrOptions.path

    if (pathOrOptions.secure) {
      secure = pathOrOptions.secure
    }

    if (pathOrOptions.cookies) {
      requestOptions.headers['Cookie'] = pathOrOptions.cookies
    }

    if (pathOrOptions.headers) {
      for (let i in pathOrOptions.headers) {
        requestOptions.headers[i] = pathOrOptions.headers[i]
      }
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

  let request = (secure ? https : http).request(requestOptions, (res) => {
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

  let timeoutListener = () => {
    gotAnError = true
    request.removeListener('error', errorListener)
    request.on('error', (e) => {})
    request.abort()

    failCallback('timeout')
  }

  function errorListener(e) {
    gotAnError = true // Not sure if that's needed
    timeoutListener = () => {}

    failCallback(e)
  }
  request.on('error', errorListener)

  request.setTimeout(timeout, () => {
    timeoutListener()
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
