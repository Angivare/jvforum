let entities = require('html-entities').Html5Entities
  , stickers = require('./stickers')
  , date = require('./date')
  , db = require('./db')

let twemoji = require('twemoji')
twemoji.base = '/assets/emoji/v1/'
twemoji.size = 'small'

function emojify(text) {
  return twemoji.parse(text)
}

function adaptMessageContent(content, id, authorNickname, postDateRaw) {
  let matches
    , regex

  // Signatures sometimes erupt due to a bug from JVC
  let signatureIndex = content.indexOf('</div><div class="signature-msg  text-enrichi-forum ">')
  if (signatureIndex != -1) {
    content = content.substr(0, signatureIndex)
  }

  content = `<div class="message__content-text">${content}</div>`

  // Edit mention
  regex = /<\/div><div class="info-edition-msg">\s*Message édité le (.+?) par\s*<span class="JvCare [0-9A-F]*" target="_blank">([^<]*)<\/span>/
  if (matches = regex.exec(content)) {
    let bylineText = date.editFormat(matches[1], postDateRaw)
    if (matches[2] && matches[2].toLowerCase() != authorNickname.toLowerCase()) {
      /* When edited by "Pseudo supprimé", it's empty
       * Example: http://www.jeuxvideo.com/forums/42-1000021-40281382-1-0-1-0-supprimer-un-pseudo-supprime-les-pseudos-qui-lui-sont-lies.htm#post_733601014
       * If it's empty, we assume the author and the editor are both "Pseudo supprimé"
       */
       bylineText += ` par <span class="message__content-edit-mention-author">${matches[2]}</span>`
    }
    content = content.replace(matches[0], '')
    content += `<p class="message__content-edit-mention"><span title="${matches[1]}">Modifié ${bylineText}</span></p>`
  }

  /* All links on JVForum should have this order of attributes: class, href, target, title, data-link-jvc. */

  // JvCare links
  // Un-shorten
  regex = /<span class="JvCare[^<]+>([^<]+)(?:<i><\/i><span>([^<]+)<\/span>([^<]+))?<\/span>/g
  while (matches = regex.exec(content)) {
    let url = matches.slice(1).join('')
      , replace = `<a href="${url}" target="_blank" title="${url}">${url}</a>`
    content = content.replace(matches[0], replace)
    regex.lastIndex = regex.lastIndex - matches[0].length + replace.length
  }

  // Non-JvCare links unshortening
  content = content.replace(/(<a[^>]+>)([^<]+)<i><\/i><span>([^<]+)<\/span>([^<]+)<\/a>/g, '$1$2$3$4</a>')

  // Email addresses
  // 1. Add mailto: at the start
  // 2. Normalize it by de-obfuscating it. Each character of a mail is randomly encoded in one of two HTML entities styles;
  //    this causes the message's checksum to change at every refresh, thus making it look as if the message has changed.
  regex = /<a href="((?:&#[x0-9a-f]+;)+)"[^<]+>([^<]+)<\/a>/g
  while (matches = regex.exec(content)) {
    let email = entities.decode(matches[1])
    content = content.replace(matches[0], `<a href="mailto:${email}" target="_blank" title="${email}">${email}</a>`)
  }

  // NoelShack thumbnails
  content = content.replace(/<a href="(?:https?:)([^"]+)" data-def="NOELSHACK" target="_blank"><img class="img-shack" width="68" height="51" src="([^"]+)" alt="[^"]+"\/><\/a>/g, (all, href, src) => {
    // Custom stickers
    if (src.indexOf('-jvforum-sticker') > -1) {
      let noelshackId = '/' + src.split('/').splice(4).join('/')
      if (noelshackId in stickers.jvcToJvf) {
        let jvfId = stickers.jvcToJvf[noelshackId]
          , packId = stickers.packFromId[jvfId]
        return `<img class="js-sticker sticker sticker--pack-${packId}" src="/assets/stickers/v2/${jvfId}" data-sticker-id="${jvfId}" data-pack-id="${packId}" data-code=":${jvfId}:" title=":${jvfId}:" alt=":${jvfId}:">`
      }
    }

    return `<a class="noelshack-link" href="${href}" target="_blank" title="${href}"><img class="noelshack-link__thumb" src="${src}" alt="${href}"></a>`
  })

  // Custom stickers on a single line, should be by themselves in order to be enlarged via CSS
  content = content.replace(/<p>\s*(<img class="js-sticker[^>]+>)\s*<\/p>/, "$1")

  // Make NoelShack links go directly to the image file
  content = content.replace(/<a class="noelshack-link" href="(?:\/\/www\.noelshack\.com\/([0-9]+)-([0-9]+)-([^"]+))" target="_blank" title="[^"]+">/g, '<a class="noelshack-link" href="//image.noelshack.com/fichiers/$1/$2/$3" target="_blank" title="//image.noelshack.com/fichiers/$1/$2/$3">')

  // Correct thumbnails for PSD and SWF on NoelShack
  content = content.replace(/(<a class="noelshack-link" href="[^"]+\.(swf|psd)"[^<]+>)<img class="noelshack-link__thumb" src="[^"]+"/g, '$1<img class="noelshack-link__thumb" src="//www.noelshack.com/pics/mini_$2.png"')

  // Spoils
  content = content.replace(/<span class="bloc-spoil-jv en-ligne">.+?<span class="contenu-spoil">/g, '<span class="spoil spoil--inline"><span class="spoil__content">')
  content = content.replace(/<span class="bloc-spoil-jv">.+?<span class="contenu-spoil">/g, '<span class="spoil spoil--block"><span class="spoil__content">')

  // Quote
  content = content.replace(/<blockquote class="blockquote-jv">/g, '<blockquote class="quote">')

  // JVF links to topics and forums
  content = content.replace(/<a href="(https?:\/\/(?:www|m)\.jeuxvideo\.com\/forums\/([0-9]+)-([0-9]+)-([0-9]+)-([0-9]+)-0-1-0-([0-9a-z-]+)\.htm(?:\#post_([0-9]+))?)"[^>]+>([^<]+)<\/a>/g, (all, url, mode, forumId, topicIdlegacyOrModern, page, slug, messageId, text) => {
    let path = '/' + forumId
    if ((mode == 1 || mode == 42) && forumId != 0) {
      path += '/'
      if (mode == 1) {
        path += '0'
      }
      path += topicIdlegacyOrModern + '-' + slug
    }
    else {
      path += '-' + slug
    }
    if (page > 1) {
      path += '/' + page
    }
    if (messageId) {
      path += '#m' + messageId
    }
    return `<a href="${path}" title="${url}" data-link-jvc="${url}">jvforum.fr${path}</a>`
  })

  // Make all non-JVF links open in a new tab for those that normally don't (jeuxvideo.com, wearefans.com, allocine.fr, etc.)
  content = content.replace(/<a href="([^/][^"]+)"( title|>)/g, '<a href="$1" target="_blank"$2')

  // Smileys
  content = content.replace(/<img src="\/\/image\.jeuxvideo\.com\/smileys_img\/([^.]+)\.(?:gif|png)" alt="([^"]+)" data-def="SMILEYS" data-code="[^"]+" title="[^"]+" \/>/g, '<img class="smiley smiley--$1" src="/assets/smileys/v1/$1" data-code="$2" title="$2" alt="$2">')

  // Stickers
  content = content.replace(/<img class="img-stickers" src="http:\/\/jv\.stkr\.fr\/p\/([^"]+)"\/>/g, (all, jvcId) => {
    if (!(jvcId in stickers.jvcToJvf)) {
      return ''
    }
    let jvfId = stickers.jvcToJvf[jvcId]
      , packId = stickers.packFromId[jvfId]
    return `<img class="js-sticker sticker sticker--pack-${packId}" src="/assets/stickers/v2/${jvfId}" data-sticker-id="${jvfId}" data-pack-id="${packId}" data-code=":${jvfId}:" title=":${jvfId}:" alt=":${jvfId}:">`
  })

  // Show thumbnails for YouTube links
  content = content.replace(/<a href="(https?:\/\/(?:[a-z]+\.)?youtube\.com\/watch[^"]*(?:\?|&amp;)v=([a-zA-Z0-9-_]{11})([^"])*)"[^>]+>.+<\/a>/g, '<a class="youtube-link" href="$1" target="_blank" title="$1"><img class="youtube-link__thumb" src="http://img.youtube.com/vi/$2/mqdefault.jpg" alt="$1"></a>')
  content = content.replace(/<a href="(https?:\/\/youtu\.be\/([a-zA-Z0-9-_]{11})([^"])*)"[^>]+>.+?<\/a>/g, '<a class="youtube-link" href="$1" target="_blank" title="$1"><img class="youtube-link__thumb" src="http://img.youtube.com/vi/$2/mqdefault.jpg" alt="$1"></a>')

  // Remove JVC embeds
  content = content.replace(/<div class="player-contenu">\s+<div class="embed-responsive embed-responsive-16by9">\s+<div class="embed-responsive-item" >\s+<div class="player-jv" id="player-jv-[0-9]+-[0-9]+" data-srcset-video="[^"]+">Chargement du lecteur vidéo...<\/div>\s+<\/div>\s+<\/div>\s+<\/div>/g, '<p><small>[ Miniature vidéo de JVC, non-visible sur JVForum ]</small></p>')
  // Remove YouTube embeds
  content = content.replace(/<div class="player-contenu"><div class="embed-responsive embed-responsive-16by9"><iframe width="[0-9]+" height="[0-9]+" src="https:\/\/www\.youtube\.com\/embed\/([^"]+)\?feature=oembed" frameborder="0" allowfullscreen><\/iframe><\/div><\/div>/g, '<a class="youtube-link" href="http://youtu.be/$1" target="_blank" title="http://youtu.be/$1"><img class="youtube-link__thumb" src="http://img.youtube.com/vi/$1/mqdefault.jpg"></a>')
  // Remove Dailymotion embeds
  content = content.replace(/<div class="player-contenu"><div class="embed-responsive embed-responsive-16by9"><iframe frameborder="0" width="[0-9]+" height="[0-9]+" src="https:\/\/www\.dailymotion\.com\/embed\/video\/([^"]+)" allowfullscreen><\/iframe><\/div><\/div>/g, '<a href="https://dai.ly/$1" target="_blank" title="https://dai.ly/$1">https://dai.ly/$1</a>')
  // Remove Twitch embeds
  content = content.replace(/<div class="player-contenu">\s*<div class="embed-responsive embed-responsive-16by9">\s*<iframe src="https:\/\/player\.twitch\.tv\/\?channel=([^&]+)&autoplay=false" allowfullscreen><\/iframe>\s*<\/div>\s*<\/div>/g, '<a href="https://www.twitch.tv/$1" target="_blank" title="$1">https://www.twitch.tv/$1</a>')

  // Cut long links
  content = content.replace(/<a ([^>]+)>([^<]{90,})<\/a>/g, (all, attributes, text) => {
    return `<a class="long-link" ${attributes}>` + text.substr(0, 85) + '<span class="long-link__hidden-part">' + text.substr(85) + '</span></a>'
  })

  content = emojify(content)

  if (content.length > 40000) {
    content = '<div class="message__content-text"><p><div class="too-big-notice">Message trop gros pour être affiché par JVForum.</div></p></div>'
  }

  return content
}

function adaptPostedMessage(message, hostname) {
  let regex = new RegExp(`https?://${hostname}/([0-9]+)(?:/([0-9]+))?-([a-z0-9]+(?:-[a-z0-9]+)*)(?:/([0-9]+))?(?:\#m([0-9]+))?(?:\#after[0-9]+)?`, 'gi')
  message = message.replace(regex, (all, forumId, topicIdJvf, slug, page, messageId) => {
    let mode = 0
      , topicIdlegacyOrModern = 0
      , indexForum = 1

    if (!page) {
      page = 1
    }
    if (topicIdJvf) {
      mode = topicIdJvf[0] == 0 ? 1 : 42
      topicIdlegacyOrModern = parseInt(topicIdJvf)
    }
    else {
      indexForum = (page - 1) * 25 + 1
      page = 1
    }

    return `http://www.jeuxvideo.com/forums/${mode}-${forumId}-${topicIdlegacyOrModern}-${page}-0-${indexForum}-0-${slug}.htm`
  })

  message = ` ${message} `
   let stickerRegex = /([^0-9]):([0-9]+):([^0-9])/
    , i = 0
    , messageSubstring
    , increment
  /* We can't use a global regex here because captures would need to overlap.
   * Example: with the string “ :1: :1: ”, “( :1:( ):1: )” would need to be captured.
   * So we loop manually.
   */
  while (messageSubstring = message.substr(i), messageSubstring.match(stickerRegex)) {
    messageSubstring = messageSubstring.replace(stickerRegex, (all, charBefore, jvfId, charAfter) => {
      let returnValue
      if (!(jvfId in stickers.jvfToJvc)) {
        returnValue = all
      }
      else {
        returnValue = charBefore
        if (stickers.jvfToJvc[jvfId][0] == '/') {
          returnValue += 'https://image.noelshack.com/fichiers/' + stickers.jvfToJvc[jvfId].split('/').splice(1).join('/')
        }
        else {
          returnValue += `[[sticker:p/${stickers.jvfToJvc[jvfId]}]]`
        }
        returnValue += charAfter
      }
      increment = returnValue.length - 2
      return returnValue
    })
    message = message.substr(0, i) + messageSubstring
    i += increment
  }
  message = message.trim()

  if (message.match(/:[a-z]/)) {
    for (let legacyShortcut in stickers.legacyShortcuts) {
      if (message.indexOf(`:${legacyShortcut}:`) > -1) {
        let jvfId = stickers.legacyShortcuts[legacyShortcut]
        message = message.replace(new RegExp(`:${legacyShortcut}:`, 'gi'), `[[sticker:p/${stickers.jvfToJvc[jvfId]}]]`)
      }
    }
  }

  if (message.includes('[[date:')) {
    message = message.replace(/\[\[date:(1?[0-9]{1,9})\]\]/g, (all, timestamp) => date.timestamp2relative(timestamp))
  }

  // Enable hashtags and asterisks at the start of a line by inserting a soft hyphen
  message = message.replace(/^(#|\*)([^ ])/, '­' + '$1$2')
  message = message.replace(/\n(#|\*)([^ ])/g, "\n" + '­' + '$1$2')

  return message
}

function logLogin(nickname, error, jvcLoginId = null) {
  db.insert('logins', {
    nickname,
    jvcLoginId, // Used to get stats about logins on JVC
    error,
  })
}

function parseUserCookie(cookie) {
  if (!cookie) {
    return false
  }

  let split = cookie.split('.')
  return {
    id: parseInt(split[0]),
    nickname: split[1],
    isLoggedIntoModeration: !!parseInt(split[2]),
    jvcCookies: {
      coniunctio: split[3],
      dlrowolleh: split[4],
    },
  }
}

function getUserFavorites(userId, thenCallback) {
  db.select('forums, topics', 'favorites', {
    userId,
  }, (results) => {
    if (!results.length) {
      thenCallback(false)
    }
    else {
      thenCallback({
        forums: JSON.parse(results[0].forums),
        topics: JSON.parse(results[0].topics),
      })
    }
  })
}

function saveAvatar(nickname, url) {
  db.insertOrUpdate('avatars', {url}, {nickname})
}

function getAvatars(nicknames, successCallback) {
  let avatars = {}
  for (let nickname of nicknames) {
    avatars[nickname] = ''
  }
  db.selectIn('nickname, url', 'avatars', 'nickname', nicknames, (results) => {
    for (let result of results) {
      avatars[result.nickname] = result.url
    }
    successCallback(avatars)
  })
}

function saveForum(id, name, slug, isLocked, parentId, subforumsIds) {
  subforumsIds = subforumsIds.join(',')
  db.insertOrUpdate('forums', {
    name,
    slug,
    isLocked,
    parentId,
    subforumsIds,
  }, {id})
}

function getForum(id, thenCallback) {
  db.select('name, slug, isLocked, parentId, subforumsIds', 'forums', {id}, (results) => {
    if (!results.length) {
      thenCallback(false)
      return
    }
    let subforumsIds = []
    if (results[0].subforumsIds.length) {
      subforumsIds = results[0].subforumsIds.split(',').map(Number)
    }
    thenCallback({
      name: results[0].name,
      slug: results[0].slug,
      isLocked: parseInt(results[0].isLocked),
      parentId: parseInt(results[0].parentId),
      subforumsIds: subforumsIds,
    })
  })
}

function getForumsNamesAndSlugs(forumsIds, thenCallback) {
  db.selectIn('id, name, slug', 'forums', 'id', forumsIds, (results) => {
    let names = {}
      , slugs = {}
    for (let id of forumsIds) {
      names[id] = `#${id}`
      slugs[id] = '0'
    }
    for (let r of results) {
      names[r.id] = r.name
      slugs[r.id] = r.slug
    }
    thenCallback({names, slugs})
  })
}

function saveTopic(idModern, params) {
  db.insertOrUpdate('topics', params, {idModern})
}

function getTopic(where, successCallback, failCallback) {
  db.query(`SELECT idModern, name, slug, numberOfPages, isDeleted, isLocked, lockRationale FROM topics WHERE ${where}`, null, (results) => {
    if (!results.length) {
      failCallback()
      return
    }
    successCallback({
      idModern: parseInt(results[0].idModern),
      name: results[0].name,
      slug: results[0].slug,
      numberOfPages: parseInt(results[0].numberOfPages),
      isDeleted: parseInt(results[0].isDeleted),
      isLocked: parseInt(results[0].isLocked),
      lockRationale: results[0].lockRationale,
    })
  })
}

function makePaginationPages(page, numberOfPages, userId, topicIdModern, callback) {
  let paginationPages = []
    , visitedStatus = {}

  if (page >= 5) {
    paginationPages.push(1)
    visitedStatus[1] = false
  }
  for (let i = Math.max(1, page - 3); i < page; i++) { // Previous three pages
    paginationPages.push(i)
    visitedStatus[i] = false
  }
  paginationPages.push(page)
  visitedStatus[page] = true
  if (page < numberOfPages) {
    for (let i = page + 1; i < Math.min(page + 4, numberOfPages); i++) {
      paginationPages.push(i)
      visitedStatus[i] = false
    }
    paginationPages.push(numberOfPages)
    visitedStatus[numberOfPages] = false
  }

  if (paginationPages.length == 1) {
    callback(visitedStatus)
    return
  }

  db.query('SELECT page FROM topics_visited_pages WHERE userId = ? AND topicIdModern = ? AND page IN (?)', [
    userId,
    topicIdModern,
    paginationPages,
  ], (results) => {
    results.forEach((row) => {
      visitedStatus[row.page] = true
    })
    callback(visitedStatus)
  })
}

// Taken from DoT
function encodeHTML(code) {
	let encodeHTMLRules = { "&": "&#38;", "<": "&#60;", ">": "&#62;", '"': "&#34;", "'": "&#39;", "/": "&#47;" }
    , matchHTML = true ? /[&<>"'\/]/g : /&(?!#?\w+;)|<|>|"|'|\//g;
	return code.toString().replace(matchHTML, function(m) {return encodeHTMLRules[m] || m;});
}

function addIsMineVariable(messages, nickname) {
  messages.forEach((message, i) => {
    message.isMine = message.nickname.toLowerCase() == nickname.toLowerCase()
  })
  return messages
}

module.exports = {
  emojify,
  adaptMessageContent,
  adaptPostedMessage,
  logLogin,
  parseUserCookie,
  getUserFavorites,
  saveAvatar,
  getAvatars,
  saveForum,
  getForum,
  getForumsNamesAndSlugs,
  saveTopic,
  getTopic,
  makePaginationPages,
  encodeHTML,
  addIsMineVariable,
}
