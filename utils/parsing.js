let cheerio = require('cheerio')
  , sha1 = require('./sha1')
  , utils = require('./utils')
  , date = require('./date')

function topic(body) {
  let $ = cheerio.load(body)
    , selection
    , returnValue = {}

  let matches
    , regex

  returnValue.name = false
  selection = $('#bloc-title-forum')
  if (selection) {
    returnValue.name = selection.text()
  }

  returnValue.messages = []
  regex = /<div class="bloc-message-forum " data-id="([0-9]+)">\s+<div class="conteneur-message">\s+(?:<div class="bloc-avatar-msg">\s+<div class="back-img-msg">\s+<div>\s+<span[^>]+>\s+<img src="[^"]+" data-srcset="([^"]+)"[^>]+>\s+<\/span>\s+<\/div>\s+<\/div>\s+<\/div>\s+)?<div class="inner-head-content">[\s\S]+?(?:<span class="JvCare [0-9A-F]+ bloc-pseudo-msg text-([^"]+)"|<div class="bloc-pseudo-msg")[^>]+>\s+([\s\S]+?)\s+<[\s\S]+?<div class="bloc-date-msg">\s+(?:<span[^>]+>)?([0-9][\s\S]+?)(?:<\/span>)?\s+<\/div>[\s\S]+?<div class="txt-msg  text-enrichi-forum ">([\s\S]+?)<\/div><\/div>\s+<\/div>\s+<\/div>\s+<\/div>/g
  let avatars = {}
  while (matches = regex.exec(body)) {
    let nickname = matches[4].includes('Pseudo supprimé') ? '' : matches[4]
      , avatar = !nickname || matches[2].includes('/default.jpg') ? '' : matches[2]
      , content = utils.adaptMessageContent(matches[6], matches[1], nickname, matches[5])
      , status = !matches[3] || matches[3] == 'user' ? '' : matches[3]
    returnValue.messages.push({
      id: parseInt(matches[1]),
      status,
      nickname,
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

  returnValue.numberOfPages = false
  regex = /<span><a href="\/forums\/[0-9]+-[0-9]+-[0-9]+-[0-9]+-[0-9]+-[0-9]+-[0-9]+-[0-9a-z-]+\.htm" class="lien-jv">([0-9]+)<\/a><\/span>/g
  while (matches = regex.exec(body)) {
    returnValue.numberOfPages = parseInt(matches[1])
  }
  if (page > returnValue.numberOfPages) {
    returnValue.numberOfPages = page
  }

  returnValue.isLocked = 0
  returnValue.lockRationale = ''
  regex = /<div class="message-lock-topic">\s+Sujet fermé pour la raison suivante :\s+<span>([^<]+)<\/span>\s+<\/div>/
  if (matches = regex.exec(body)) {
    returnValue.isLocked = 1
    returnValue.lockRationale = matches[1]
  }

  returnValue.idModern = 0
  regex = /var id_topic = ([0-9]+);\s+\/\/ \]\]>/
  if (matches = regex.exec(body)) {
    returnValue.idModern = parseInt(matches[1])
  }

  returnValue.pollTitle = ''
  regex = /<div class="intitule-sondage">([^<]+)<\/div>/
  if (matches = regex.exec(body)) {
    returnValue.pollTitle = matches[1]
  }

  return returnValue
}

function forum(body) {
  let $ = cheerio.load(body)
    , returnValue = {}
    , selection

  returnValue.name = ''
  selection = $('.highlight')
  if (selection) {
    returnValue.name = selection.text().substr("Forum ".length).replace(/ - Page [0-9]+$/, '')
  }

  returnValue.topics = []
  selection = $('li[data-id]', '.topic-list')
  selection.each((index, element) => {
    let url = $('.topic-title', element).attr('href')
      , urlSplit = url.split('/forums/')[1].split('-')
      , dateRaw = $('.topic-date span', element).text().trim()

    returnValue.topics.push({
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
  returnValue.isLocked = $('#bloc-formulaire-forum .alert').length > 0

  returnValue.parentId = 0
  if (2 in $('.fil-ariane-crumb span a')) {
    let element = $('.fil-ariane-crumb span a')[2]
      , elementText = $(element).text()
      , url = $(element).attr('href')

    if (elementText.substr(0, 'Forum principal '.length) == 'Forum principal ') {
      // Game forums, but not their subforums, have their breadcrumb include a link to the game's info page
      returnValue.parentId = parseInt(url.split('-')[1])
    }
  }

  returnValue.subforumsIds = []
  $('.liste-sous-forums .lien-jv').each((index, element) => {
    let url = $(element).attr('href')
    returnValue.subforumsIds.push(parseInt(url.split('-')[1]))
  })
  returnValue.subforumsIds = returnValue.subforumsIds.sort((a, b) => {
    return a - b
  })

  returnValue.hasNextPage = $('.pagi-suivant-actif').length > 0

  return returnValue
}

function form(body) {
  let returnValue = {}
    , regex = /<input type="hidden" name="(fs_[^"]+)" value="([^"]+)"\/>/g
    , matches

  while (matches = regex.exec(body)) {
    returnValue[matches[1]] = matches[2]
  }
  if (returnValue.length == 0) {
    return false
  }
  return returnValue
}

function editResponse(body) {
  let regex = /<div class="bloc-message-forum " data-id="([0-9]+)">\s+<div class="conteneur-message">\s+(?:<div class="bloc-avatar-msg">\s+<div class="back-img-msg">\s+<div>\s+<span[^>]+>\s+<img src="[^"]+" data-srcset="([^"]+)"[^>]+>\s+<\/span>\s+<\/div>\s+<\/div>\s+<\/div>\s+)?<div class="inner-head-content">[\s\S]+?(?:<span class="JvCare [0-9A-F]+ bloc-pseudo-msg text-([^"]+)"|<div class="bloc-pseudo-msg")[^>]+>\s+([\s\S]+?)\s+<[\s\S]+?<div class="bloc-date-msg">\s+(?:<span[^>]+>)?([0-9][\s\S]+?)(?:<\/span>)?\s+<\/div>[\s\S]+?<div class="txt-msg  text-enrichi-forum ">([\s\S]+?)<\/div><\/div>\s+<\/div>\s+<\/div>\s+<\/div>/
    , matches = body.match(regex)
  if (!matches) {
    return false
  }
  let content = utils.adaptMessageContent(matches[6], matches[1], matches[4], matches[5])
  return {
    content,
    checksum: sha1(content).substr(0, 8),
  }
}

function profile(body) {
  let returnValue = {}

  let matches
    , regex

  returnValue.nickname = false
  regex = /<h1>([^<]+)<\/h1>/
  if (matches = regex.exec(body)) {
    returnValue.nickname = matches[1].trim()
  }

  returnValue.avatar = false
  regex = /<img alt="Avatar de [^"]+" src="https?:\/\/image\.jeuxvideo\.com([^"]+)">/
  if (matches = regex.exec(body)) {
    if (matches[1].split('/').pop() != 'default.jpg') {
      returnValue.avatar = matches[1].replace(/^\/avatar(s)?-md\//, '/avatar$1/')
    }
  }

  returnValue.backgroundCover = false
  regex = /<div id="content" style="background: url\('https?:\/\/image\.noelshack\.com\/fichiers([^']+)'\) /
  if (matches = regex.exec(body)) {
    returnValue.backgroundCover = matches[1]
  }

  returnValue.registrationTimestamp = false
  regex = /<div class="info-lib">Membre depuis :<\/div><div class="info-value">([^<]+)<\/div>/
  if (matches = regex.exec(body)) {
    let registrationDate = matches[1].split('(')[0].trim()
    returnValue.registrationTimestamp = date.convertProfileDateToTimestamp(registrationDate)
  }

  returnValue.messages = false
  regex = /<div class="info-lib">Messages Forums :<\/div><div class="info-value">([0-9.]+) messages?<\/div>/
  if (matches = regex.exec(body)) {
    returnValue.messages = parseInt(matches[1].replace('.', ''))
  }

  /* To parse description and signature the regex must encompass the cases
   * when there's the two as well as when there's one but not the other.
   */

  returnValue.description = false
  regex = /<div class="bloc-description-desc txt-enrichi-desc-profil">([\s\S]+?)<\/div>\s{32}/
  if (matches = regex.exec(body)) {
   returnValue.description = utils.adaptMessageContent(matches[1])
  }

  returnValue.signature = false
  regex = /<p>Signature dans les forums :<\/p>\s+<div>([\s\S]+?)<\/div>\s+<\/div>\s{20}/
  if (matches = regex.exec(body)) {
   returnValue.signature = utils.adaptMessageContent(matches[1])
  }

  returnValue.banished = false
  regex = /<div class="alert-row"> Le pseudo est banni\. <\/div>\s{12}/
  if (matches = regex.exec(body)) {
   returnValue.banished = true
  }

  return returnValue
}

module.exports = {
  topic,
  forum,
  form,
  editResponse,
  profile,
}
