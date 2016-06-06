let http = require('http')
, config = require('../config')

function fetch(path, successCallback, failCallback) {
  let request = http.request({
    hostname: 'www.jeuxvideo.com',
    path,
    headers: {
      'Cookie': 'coniunctio=cache_bypass'
    }
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

  request.setTimeout(config.timeout, () => {
    failCallback('timeout')
  })

  request.end()
}

module.exports = fetch
