let cheerio = require('cheerio')
  , sha1 = require('sha1')
  , utils = require('./utils')
  , date = require('./date')

function topic(body) {
  let $ = cheerio.load(body)
    , selection
    , r = retour = {}

  let matches
    , regex

  r.name = false
  selection = $('#bloc-title-forum')
  if (selection) {
    r.name = selection.text()
  }

  r.forumSlug = r.forumName = false
  selection = $('.fil-ariane-crumb span a')
  if (selection) {
    selection.each((index, element) => {
      if ($(element).html().substr(0, 6) == 'Forum ') {
        r.forumName = $(element).text().substr(6)
        r.forumSlug = $(element).attr('href').split('-').slice(7).join('-').split('.')[0]
      }
    })
  }

  retour.messages = []
  regex = /<div class="bloc-message-forum " data-id="([0-9]+)">\s+<div class="conteneur-message">\s+(?:<div class="bloc-avatar-msg">\s+<div class="back-img-msg">\s+<div>\s+<span[^>]+>\s+<img src="[^"]+" data-srcset="([^"]+)"[^>]+>\s+<\/span>\s+<\/div>\s+<\/div>\s+<\/div>\s+)?<div class="inner-head-content">[\s\S]+?(?:<span class="JvCare [0-9A-F]+ bloc-pseudo-msg text-([^"]+)"|<div class="bloc-pseudo-msg")[^>]+>\s+([\s\S]+?)\s+<[\s\S]+?<div class="bloc-date-msg">\s+(?:<span[^>]+>)?([0-9][\s\S]+?)(?:<\/span>)?\s+<\/div>[\s\S]+?<div class="txt-msg  text-enrichi-forum ">([\s\S]+?)<\/div><\/div>\s+<\/div>\s+<\/div>\s+<\/div>/g
  let avatars = {}
  while (matches = regex.exec(body)) {
    let isNicknameDeleted = matches[4].includes('Pseudo supprimé')
      , content = utils.adaptMessageContent(matches[6], matches[1])
      , avatar = isNicknameDeleted || matches[2].includes('/default.jpg') ? '' : matches[2]
      , nickname = matches[4]
    retour.messages.push({
      id: parseInt(matches[1]),
      status: matches[3],
      nickname,
      isNicknameDeleted,
      dateRaw: matches[5],
      content,
      checksum: sha1(content).substr(0, 8),
    })
    avatars[nickname.toLowerCase()] = avatar
  }
  for (let nickname in avatars) {
    utils.saveAvatar(nickname, avatars[nickname])
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
  if (page > retour.lastPage) {
    retour.lastPage = page
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

  retour.isLocked = 0
  retour.lockRationale = ''
  regex = /<div class="message-lock-topic">\s+Sujet fermé pour la raison suivante :\s+<span>([^<]+)<\/span>\s+<\/div>/
  if (matches = regex.exec(body)) {
    retour.isLocked = 1
    retour.lockRationale = matches[1]
  }

  retour.idModern = 0
  regex = /var id_topic = ([0-9]+);\s+\/\/ \]\]>/
  if (matches = regex.exec(body)) {
    retour.idModern = parseInt(matches[1])
  }

  return r
}

function forum(body) {
  let $ = cheerio.load(body)
    , r = {}
    , selection

  r.name = ''
  selection = $('.highlight')
  if (selection) {
    r.name = selection.text().substr("Forum ".length)
  }

  r.topics = []
  selection = $('li[data-id]', '.topic-list')
  selection.each((index, element) => {
    let url = $('.topic-title', element).attr('href')
      , urlSplit = url.split('/forums/')[1].split('-')
      , dateRaw = $('.topic-date span', element).text().trim()

    r.topics.push({
      id: $(element).data('id'),
      label: $('.topic-img', element).attr('src').substr("/img/forums/topic-".length).split('.')[0],
      idJvf: (urlSplit[0] == 1 ? '0' : '') + urlSplit[2],
      slug: url.substr(url.indexOf('-1-0-1-0-') + '-1-0-1-0-'.length).split('.')[0],
      title: $('.topic-title', element).attr('title'),
      status: !$('.topic-author', element).attr('style') ? $('.topic-author', element).attr('class').split(' ')[2].substr('user-'.length) : 'deleted',
      nickname: $('.topic-author', element).text().trim(),
      answerCount: parseInt($('.topic-count', element).text().trim()),
      dateRaw,
    })
  })

  // Text on JVC: Vous ne pouvez pas créer un nouveau sujet sur ce forum car il est fermé.
  r.isLocked = $('#bloc-formulaire-forum .alert').length > 0

  r.parentId = 0
  if (2 in $('.fil-ariane-crumb span a')) {
    let element = $('.fil-ariane-crumb span a')[2]
      , elementText = $(element).text()
      , url = $(element).attr('href')

    if (elementText.substr(0, 'Forum principal '.length) == 'Forum principal ') {
      // Game forums, but not their subforums, have their breadcrumb include a link to the game's info page
      r.parentId = parseInt(url.split('-')[1])
    }
  }

  r.subforumsIds = []
  $('.liste-sous-forums .lien-jv').each((index, element) => {
    let url = $(element).attr('href')
    r.subforumsIds.push(parseInt(url.split('-')[1]))
  })
  r.subforumsIds = r.subforumsIds.sort((a, b) => {
    return a - b
  })

  return r
}

function form(body) {
  let r = {}
    , regex = /<input type="hidden" name="(fs_[^"]+)" value="([^"]+)"\/>/g
    , matches

  while (matches = regex.exec(body)) {
    r[matches[1]] = matches[2]
  }
  if (r.length == 0) {
    return false
  }
  return r
}

module.exports = {
  topic,
  forum,
  form,
}
