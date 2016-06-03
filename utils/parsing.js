let cheerio = require('cheerio')
  , utils = require('./utils')

function topic(body) {
  let $ = cheerio.load(body)
    , r = {}
    , matches
    , regex

  r.title = $('#bloc-title-forum').text() || false

  let $forum = $('.fil-ariane-crumb > span').eq(2)
  r.forumSlug = $forum.attr('href')
  r.forumName = $forum.last().text().substring('Forum '.length)
  r.messages = []

  $('.bloc-message-forum').each(function() {
    let msg = $(this)
    let img = msg.find('.back-img-msg > div > span > img'),
        avatar = img.attr('data-srcset'),
        nickname = msg.find('.bloc-pseudo-msg').text(),
        isNicknameDeleted = (nickname == 'Pseudo supprimé')

    if (isNicknameDeleted || avatar.includes('/default.jpg')) avatar = false

    r.messages.push({
      id: msg.attr('data-id'),
      avatar,
      status: img.attr('class').substring(0, img.attr('class').indexOf('-')),
      nickname,
      isNicknameDeleted,
      date: msg.find('.bloc-date-msg').text(),
      content: utils.adaptMessageContent(msg.find('.bloc-contenu').html())
    })
  })

  let page = parseInt($('.page-active').last().text(), 10)
  r.lastPage = parseInt($('.bloc-liste-num-page .lien-jv').eq(-2).text(), 10)
  r.paginationPages = []
  if (page >= 5) {
    r.paginationPages.push(1)
  }
  for (let i = Math.max(1, page - 3); i < page; i++) { // Previous three pages
    r.paginationPages.push(i)
  }
  r.paginationPages.push(page)
  if (page < r.lastPage) {
    for (let i = page + 1; i < Math.min(page + 4, r.lastPage); i++) {
      r.paginationPages.push(i)
    }
    r.paginationPages.push(r.lastPage)
  }

  let lock = $('.message-lock-topic')
  r.isLocked = r.lockRationale = false
  if (lock.length) {
    r.isLocked = true
    r.lockRationale = lock.text().substring(lock.text().indexOf(':') + 2)
  }

  return r
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

  r.topics = []
  selection = $('li[data-id]', '.topic-list')
  selection.each((index, element) => {
    let url = $('.topic-title', element).attr('href')
      , urlSplit = url.split('/forums/')[1].split('-')

    r.topics.push({
      id: $(element).data('id'),
      label: $('.topic-img', element).attr('src').substr("/img/forums/topic-".length).split('.')[0],
      idJvf: (urlSplit[0] == 1 ? '0' : '') + urlSplit[2],
      slug: url.substr(url.indexOf('-1-0-1-0-') + '-1-0-1-0-'.length).split('.')[0],
      title: $('.topic-title', element).attr('title'),
      status: !$('.topic-author', element).attr('style') ? $('.topic-author', element).attr('class').split(' ')[2].substr('user-'.length) : 'deleted',
      nickname: $('.topic-author', element).text().trim(),
      answerCount: parseInt($('.topic-count', element).text().trim()),
      date: $('.topic-date span', element).text().trim(),
    })
  })

  // Text on JVC: Vous ne pouvez pas créer un nouveau sujet sur ce forum car il est fermé.
  r.isLocked = $('#bloc-formulaire-forum .alert').length > 0

  r.parent = false
  if (2 in $('.fil-ariane-crumb span a')) {
    let element = $('.fil-ariane-crumb span a')[2]
      , url = $(element).attr('href')

    r.parent = {
      title: $(element).text().substr('Forum principal '.length),
      id: parseInt(url.split('-')[1]),
      slug: url.substr(url.indexOf('-1-0-1-0-') + '-1-0-1-0-'.length).split('.')[0],
    }
  }

  r.subforums = []
  $('.liste-sous-forums .lien-jv').each((index, element) => {
    let url = $(element).attr('href')

    r.subforums.push({
      title: $(element).text().trim(),
      id: parseInt(url.split('-')[1]),
      slug: url.substr(url.indexOf('-1-0-1-0-') + '-1-0-1-0-'.length).split('.')[0],
    })
  })
  if (r.subforums.length == 0) {
    r.subforums = false
  }

  return r
}

module.exports = {
  topic,
  forum,
}
