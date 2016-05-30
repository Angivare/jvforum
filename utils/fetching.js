let http = require('http')
, config = require('../config')

function topic(mode, forumId, idLegacyOrNew, page, slug, successCallback, failCallback) {
  let request = http.request({
    hostname: 'www.jeuxvideo.com',
    path: `/forums/${mode}-${forumId}-${idLegacyOrNew}-${page}-0-1-0-${slug}.htm`,
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

function forum(id, slug, page, successCallback, failCallback) {
  let request = http.request({
    hostname: 'www.jeuxvideo.com',
    path: `/forums/0-${id}-0-${page}-0-1-0-${slug}.htm`,
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

module.exports = {
  topic,
  forum,
}
