let http = require('http')
, config = require('../config')

function fetch(url, successCallback, failCallback) {
  let request = http.request({
    hostname: 'www.jeuxvideo.com',
    path: url,
    headers: {
      'Cookie': 'coniunctio=cache_bypass'
    }
  }, (res) => {
    let body = ''
    res.on('data', (chunk) => {
      body += chunk
    })
    res.on('end', () => {
      successCallback(res.headers, body)
    })
  })

  request.on('error', failCallback)

  request.setTimeout(config.timeout, () => {
    failCallback('timeout')
  })

  request.end()
}

function topic(mode, forumId, idlegacyOrModern, page, slug, successCallback, failCallback) {
  fetch(`/forums/${mode}-${forumId}-${idlegacyOrModern}-${page}-0-1-0-${slug}.htm`, successCallback, failCallback)
}

function forum(id, slug, page, successCallback, failCallback) {
  fetch(`/forums/0-${id}-0-${page}-0-1-0-${slug}.htm`, successCallback, failCallback)
}

module.exports = {
  topic,
  forum,
}
