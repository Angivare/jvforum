let cheerio = require('cheerio')
  , utils = require('./utils')

function topic(body) {
  let retour = {}
    , matches
    , regex

  retour.title = false
  if (matches = body.match(/<span id="bloc-title-forum">(.+)<\/span>/)) {
    retour.title = matches[1]
  }

  retour.forumSlug = retour.forumName = false
  if (matches = body.match(/<span><a href="\/forums\/0-(?:[0-9]+)-0-1-0-1-0-([a-zA-Z0-9-]+)\.htm">Forum ([^<]+)<\/a><\/span>/)) {
    retour.forumSlug = matches[1]
    retour.forumName = matches[2]
  }

  retour.messages = []
  regex = /<div class="bloc-message-forum " data-id="([0-9]+)">\s+<div class="conteneur-message">\s+(?:<div class="bloc-avatar-msg">\s+<div class="back-img-msg">\s+<div>\s+<span[^>]+>\s+<img src="[^"]+" data-srcset="([^"]+)"[^>]+>\s+<\/span>\s+<\/div>\s+<\/div>\s+<\/div>\s+)?<div class="inner-head-content">[\s\S]+?(?:<span class="JvCare [0-9A-F]+ bloc-pseudo-msg text-([^"]+)"|<div class="bloc-pseudo-msg")[^>]+>\s+([\s\S]+?)\s+<[\s\S]+?<div class="bloc-date-msg">\s+(?:<span[^>]+>)?([0-9][\s\S]+?)(?:<\/span>)?\s+<\/div>[\s\S]+?<div class="txt-msg  text-enrichi-forum ">([\s\S]+?)<\/div><\/div>\s+<\/div>\s+<\/div>\s+<\/div>/g
  while (matches = regex.exec(body)) {
    let isNicknameDeleted = matches[4].includes('Pseudo supprimé')
    retour.messages.push({
      id: matches[1],
      avatar: isNicknameDeleted || matches[2].includes('/default.jpg') ? false : matches[2],
      status: matches[3],
      nickname: matches[4],
      isNicknameDeleted,
      date: matches[5],
      content: utils.adaptMessageContent(matches[6]),
    })
  }

  let page = false
  regex = /<span class="page-active">([0-9]+)<\/span>/
  if (matches = regex.exec(body)) {
    page = parseInt(matches[1])
  }

  retour.lastPage = false
  regex = /<span><a href="\/forums\/[0-9]+-[0-9]+-[0-9]+-[0-9]+-[0-9]+-[0-9]+-[0-9]+-[0-9a-z-]+\.htm" class="lien-jv">([0-9]+)<\/a><\/span>/g
  while (matches = regex.exec(body)) {
    retour.lastPage = parseInt(matches[1])
  }

  retour.paginationPages = []
  if (page >= 5) {
    retour.paginationPages.push(1)
  }
  for (let i = Math.max(1, page - 3); i < page; i++) { // Previous three pages
    retour.paginationPages.push(i)
  }
  retour.paginationPages.push(page)
  if (page < retour.lastPage) {
    for (let i = page + 1; i < Math.min(page + 4, retour.lastPage); i++) {
      retour.paginationPages.push(i)
    }
    retour.paginationPages.push(retour.lastPage)
  }

  retour.isLocked = retour.lockRationale = false
  regex = /<div class="message-lock-topic">\s+Sujet fermé pour la raison suivante :\s+<span>([^<]+)<\/span>\s+<\/div>/
  if (matches = regex.exec(body)) {
    retour.isLocked = true
    retour.lockRationale = matches[1]
  }

  return retour
}

function forum(body) {
  let $ = cheerio.load(body)
    , r = []
    , selection

  r.title = false
  selection = $('.highlight')
  if (selection) {
    r.title = selection.text().substr("Forum ".length)
  }

  return r
}

module.exports = {
  topic,
  forum,
}
