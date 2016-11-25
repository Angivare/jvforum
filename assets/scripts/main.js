let isFormReadyToPost = false
  , hasTouch = false
  , refreshTimeout
  , lastRefreshTimestamp = 0
  , messagesChecksums
  , refreshInterval
  , messagesEvents = []
  , isSliderSliding = false
  , sliderTopOffset = 0
  , stickerPackWidth
  , stickerDemoWidth
  , isIOS = /\((iPhone|iPod|iPad)/.test(navigator.userAgent)
  , selectedHeadPackId

function qs(selectors, callback) {
  let element = document.querySelector(selectors)
  if (element && callback) {
    return callback(element)
  }
  return element
}

function qsa(selectors, callback) {
  ;[].forEach.call(document.querySelectorAll(selectors), callback)
}

function ajax(url, timeout, objectData = {}, callback = () => {}) {
  let data = [
        `_csrf=${_csrf}`,
      ]
  for (let key in objectData) {
    if (objectData.hasOwnProperty(key)) {
      data.push(encodeURIComponent(key) + '=' + encodeURIComponent(objectData[key]))
    }
  }
  data = data.join('&')

  let xhr = instantClick.xhr()
  xhr.open('POST', url)
  xhr.timeout = timeout
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
  xhr.addEventListener('readystatechange', () => {
    if (xhr.readyState < 4) {
      return
    }

    let status = xhr.status
      , response = xhr.responseText
    if (status == 200) {
      response = JSON.parse(response)
    }
    callback(status, response, xhr)
  })
  xhr.send(data)
}

function stringToElements(string) {
  let template = document.createElement('template')
  template.innerHTML = string
  let elements = template.content.children
    , array = []
  /* Putting it in an array allows loops. Otherwise if an element is appended
   * it disappears and the loop index is broken.
   */
  for (let i = 0; i < elements.length; i++) {
    array.push(elements[i])
  }
  return array
}

function setAsHavingTouch() {
  qs('html').classList.add('has-touch')
  hasTouch = true
  document.body.removeEventListener('touchstart', setAsHavingTouch)
}

function showErrors(errors) {
  qs('.form__errors p').innerHTML = errors
  qs('.form__errors').classList.add('form__errors--shown')
}

function alertPlaceholder() {
  alert('Cette fonction reviendra plus tard')
}

function addMessagesEvent(element, type, listener) {
  messagesEvents.push({
    element,
    type,
    listener,
  })
  instantClick.on('change', function() {
    qsa('.message ' + element, (element) => {
      element.addEventListener(type, listener)
    })
  })
}

function toggleSpoil(event) {
  event.stopPropagation()
  let target = event.target
  if (target.tagName == 'A' || target.classList.contains('sticker') || target.classList.contains('noelshack-link__thumb')) {
    return
  }
  this.classList.toggle('spoil--revealed')
}

function postMessage(event) {
  event.preventDefault()

  let message = qs('.form__textarea').value

  if (message.length == 0) {
    qs('.form__textarea').focus()
    return
  }

  qs('.button-mobile-post__visible').classList.add('button-mobile-post__visible--sending')
  qs('.button-mobile-post').blur()

  let data = {
    message,
    forumId,
    topicMode,
    topicIdLegacyOrModern,
    topicSlug,
    _csrf,
  }

  ajax('/ajax/postMessage', timeouts.postMessage, {
    message,
    forumId,
    topicMode,
    topicIdLegacyOrModern,
    topicSlug,
  }, (status, response, xhr) => {
    qs('.button-mobile-post__visible').classList.remove('button-mobile-post__visible--sending')

    if (status != 200) {
      showErrors(`Problème réseau`)
      return
    }
    if (response.error) {
      showErrors(response.error)
      return
    }

    qs('.form__errors').classList.remove('form__errors--shown')
    qs('.form__textarea').value = ''

    isFormReadyToPost = false
    qs('.button-mobile-post__visible').classList.remove('button-mobile-post__visible--ready-to-post')

    if (!hasTouch) {
      qs('.form__textarea').focus()
    }
  })
}

function readyFormToPost() {
  if (isFormReadyToPost) {
    if (!qs('.form__textarea').value.trim()) {
      isFormReadyToPost = false
      qs('.button-mobile-post__visible').classList.remove('button-mobile-post__visible--ready-to-post')
      return
    }
  }

  if (qs('.form__textarea').value.trim()) {
    qs('.button-mobile-post__visible').classList.add('button-mobile-post__visible--ready-to-post')
    isFormReadyToPost = true
  }
}

function startRefreshCycle() {
  if (document.body.className.indexOf(' topic-') == -1) {
    return
  }

  let lastMessageElement = qs('.message:last-child')
    , lastMessageAge = 0
  if (lastMessageElement) {
    lastMessageAge = parseInt(lastMessageElement.dataset.age)
  }

  messagesChecksums = {}
  qsa('.message', (element) => {
    messagesChecksums[element.id.substr(1)] = element.dataset.checksum
  })

  let isLastPage = false
  qs('.pagination-topic--bottom .pagination-topic__page:last-child .pagination-topic__page-link', (element) => {
    isLastPage = element.classList.contains('pagination-topic__page-link--active')
  })
  if (isLastPage || lastMessageAge < 5 * 60) {
    refreshInterval = refreshIntervals.recent
    instantClick.setInterval(restartRefreshIfNeeded, refreshIntervals.check)
  }
  else {
    refreshInterval = refreshIntervals.old
  }
  instantClick.setTimeout(refresh, refreshInterval - cacheAge)
}

function restartRefreshIfNeeded() {
  if (lastRefreshTimestamp < +new Date - refreshIntervals.check) {
    refresh()
  }
}

function refresh() {
  lastRefreshTimestamp = +new Date

  ajax('/ajax/refresh', timeouts.refresh, {
    forumId: forumId,
    topicMode: topicMode,
    topicIdLegacyOrModern: topicIdLegacyOrModern,
    topicSlug: topicSlug,
    topicPage: topicPage,
    numberOfPages: numberOfPages,
    messagesChecksums: JSON.stringify(messagesChecksums),
  }, (status, response, xhr) => {
    if (status == 200) {
      if (response.error) {
        if (response.error == 'deleted' && numberOfPages) { // non-zero numberOfPages means we're not already on an error page
          location.href = location.pathname
        }
        return
      }

      if (numberOfPages == 0 && response.numberOfPages) {
        // We're on an error page and there's no more error (such as a topic that's no longer deleted)
        location.href = location.pathname
      }

      if ('newMessagesHTML' in response) {
        for (let element of stringToElements(response.newMessagesHTML)) {
          qs('.messages-list').appendChild(element)
        }
      }

      for (let id in response.messages) {
        let message = response.messages[id]

        if (!(id in messagesChecksums)) {
          // New message
          messagesChecksums[id] = message.checksum

          for (let i = 0; i < messagesEvents.length; i++) {
            qsa(`#m${id} ${messagesEvents[i].element}`, (element) => {
              element.addEventListener(messagesEvents[i].type, messagesEvents[i].listener)
            })
          }
          continue
        }

        // Update
        qs(`#m${id}`).dataset.age = message.age
        qs(`#m${id} .js-date`).innerHTML = message.date
        if ('content' in message) {
          qs(`#m${id}`).dataset.checksum = message.checksum
          messagesChecksums[id] = message.checksum

          qs(`#m${id} .js-content`).innerHTML = message.content

          for (let i = 0; i < messagesEvents.length; i++) {
            qsa(`#m${id} ${messagesEvents[i].element}`, (element) => {
              element.addEventListener(messagesEvents[i].type, messagesEvents[i].listener)
            })
          }
        }
      }

      if ('paginationHTML' in response) {
        qsa('.pagination-topic__pages', (element) => {
          element.innerHTML = response.paginationHTML
        })
        numberOfPages = response.numberOfPages
      }
    }

    if (!xhr.instantKilled) {
      instantClick.setTimeout(refresh, refreshInterval)
    }
  })
}

function syncFavorites() {
  ajax('/ajax/syncFavorites', timeouts.syncFavorites)
}

function makeFavoritesSlideable() {
  if (screen.width < 1025) {
    return
  }

  if (!qs('.js-slider')) {
    return
  }

  setSliderTopOffset()
  instantClick.addEventListener('resize', setSliderTopOffset)

  adjustSliderWidth()
  instantClick.addEventListener('resize', adjustSliderWidth)

  makeFavoritesSlide()
  instantClick.addEventListener('scroll', makeFavoritesSlide)
  instantClick.addEventListener('resize', makeFavoritesSlide)
}

function setSliderTopOffset() {
  sliderTopOffset = qs('.js-favorites-forums').getBoundingClientRect().bottom + scrollY
}

function adjustSliderWidth() {
  // Because it doesn't inherit its width parent in fixed position
  qs('.js-slider').style.width = qs('.menu.js-favorites-forums').offsetWidth + 'px'
}

function makeFavoritesSlide() {
  if (sliderTopOffset > 0 && scrollY > sliderTopOffset) {
    if (!isSliderSliding) {
      qs('.js-slider').classList.add('sliding')
      isSliderSliding = true
    }
  }
  else {
    if (isSliderSliding) {
      qs('.js-slider').classList.remove('sliding')
      isSliderSliding = false
    }
  }
}

function goToForm() {
  qs('.js-form-post .form__textarea').focus()
  scrollTo(0, qs('.js-form-post').getBoundingClientRect().top + scrollY)
}

function toggleMobileMenu() {
  qs('.menu-mobile__opener').classList.toggle('menu-mobile__opener--hidden')
  qs('.canvas').classList.toggle('canvas--under-stage-with-menu-mobile-items')
  qs('.stage').addEventListener('click', toggleMobileMenu)
  qs('.stage').classList.toggle('stage--shown')
  qs('.stage').innerHTML = ''
  qs('.stage').appendChild(document.importNode(qs('#menu-mobile-items').content.firstElementChild, true))
}

function alignStickerPack(packElement) {
  let stickersCount = packElement.children.length

  let stickersPerLine = Math.trunc(stickerPackWidth / stickerDemoWidth)
    , stickersCountOnLastLine = stickersCount % stickersPerLine

  packElement.dataset.stickersCountOnLastLine = stickersCountOnLastLine
  if (stickersCountOnLastLine == 0) {
    packElement.lastElementChild.style.marginRight = `0`
    return
  }

  let marginUsedOnFullLines = stickerPackWidth % stickerDemoWidth
    , marginUsedOnLastLine = stickersCountOnLastLine * (marginUsedOnFullLines / stickersPerLine)

  let marginRight = stickerPackWidth - (stickersCountOnLastLine * stickerDemoWidth) - marginUsedOnLastLine
  packElement.lastElementChild.style.marginRight = `${marginRight}px`
}

function alignAllStickerPacks() {
  let newStickerPackWidth = qs('.stickers-pack').getBoundingClientRect().width
  if (newStickerPackWidth == stickerPackWidth) {
    return
  }
  stickerPackWidth = newStickerPackWidth
  stickerDemoWidth = qs('.stickers-pack__sticker').getBoundingClientRect().width
  qsa('.stickers-pack', alignStickerPack)
}

function noteStickerAndGoBack(event) {
  localStorage.stickerToInsert = event.target.dataset.stickerId
  history.back()
}

function setUpStickers() {
  stickerPackWidth = undefined
  selectedHeadPackId = 0
  instantClick.addEventListener('resize', alignAllStickerPacks)
  alignAllStickerPacks()
  qs('.stickers-heads-container').scrollTop = 9999

  qsa('.stickers-pack__sticker', (element) => {
    element.addEventListener('click', noteStickerAndGoBack)
  })

  instantClick.addEventListener('scroll', selectHead)
  selectHead()
}

function selectHead() {
  let packId
    , heads = []
  qsa('.stickers-pack', (element) => {
    if (element.getBoundingClientRect().top >= 0) {
      packId = parseInt(element.dataset.packId)
      if (packId == selectedHeadPackId) {
        return
      }
      if (selectedHeadPackId) {
        qs(`.js-stickers-head-${selectedHeadPackId}`).classList.remove('stickers-heads__head--selected')
      }
      qs(`.js-stickers-head-${packId}`).classList.add('stickers-heads__head--selected')
      selectedHeadPackId = packId
    }
  })
}

function insertStickerIntoMessage() {
  if (!localStorage.stickerToInsert) {
    return
  }
  let textarea = qs('.form__textarea')
  if (!textarea) {
    return
  }
  let insertionPoint = textarea.selectionEnd
  if (isIOS) {
    /* iOS doesn't want to focus the form, so selectionEnd isn't updated.
     * We get around this by simply adding the sticker at the end.
     */
    insertionPoint = textarea.value.length
  }
  let stringBeforeInsertionPoint = textarea.value.substr(0, insertionPoint)
    , stringAfterInsertionPoint = textarea.value.substr(insertionPoint)
  textarea.value = `${stringBeforeInsertionPoint} :${localStorage.stickerToInsert}: ${stringAfterInsertionPoint}`
  textarea.focus()
  readyFormToPost()
  localStorage.removeItem('stickerToInsert')
}

function showImbricatedQuote(event) {
  let element = event.target
  element.removeEventListener('click', showImbricatedQuote)
  element.classList.add('quote--imbricated-shown')
}

function html2jvcode(html) {
  return JVCode.toJVCode(html)
}

function quoteMessage(event) {
  let element = event.target
  while (!element.id) {
    element = element.parentNode
  }
  let {id, nickname, timestamp} = element.dataset
    , textarea = qs('.form__textarea')
    , html = qs(`#m${id} .message__content-text`).innerHTML.trim()
    , text = html2jvcode(html)
    , quote = ''
  if (textarea.value) {
    if (!/\n\n$/.test(textarea.value)) {
      quote += "\n\n"
    }
  }
  quote += `> '''${nickname}''', [[date:${timestamp}]] :\n`
  quote += `> \n`
  quote += `> ${text.split("\n").join("\n> ")}`
  quote += "\n\n"

  textarea.focus() // Must be before setting value in order to have the cursor at the bottom
  textarea.value += quote
}

function toggleMenu(event) {
  let element = event.target
    , id
  while (!(id = element.id)) {
    element = element.parentNode
  }
  qs(`#${id}`).classList.toggle('message--menu-opened')
}

function closeMenu(event) {
  let element = event.target
    , id
  if (element.classList.contains('js-menu')) {
    return
  }
  while (!(id = element.id)) {
    element = element.parentNode
  }
  qs(`#${id}`).classList.remove('message--menu-opened')
}

function enlargeEmoji(event) {
  if (hasTouch) {
    return
  }
  if (event.target.className != 'emoji') {
    let emojiContainerElement = qs('.emoji-container')
    if (emojiContainerElement && emojiContainerElement.classList.contains('emoji-container--shown')) {
      emojiContainerElement.classList.remove('emoji-container--shown')
    }
    return
  }
  let emojiContainerElement = qs('.emoji-container')
  let {left, top, width} = event.target.getBoundingClientRect()
  emojiContainerElement.src = event.target.src
  emojiContainerElement.classList.add('emoji-container--shown')
  emojiContainerElement.style.left = `${left + ((width - 48) / 2)}px`
  emojiContainerElement.style.top = `${top - 48 - 4}px`
}

instantClick.init()

if (googleAnalyticsId) {
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
  ga('create', googleAnalyticsId, 'auto');

  instantClick.on('change', function() {
    ga('set', 'dimension1', 'Member')
    ga('send', 'pageview', location.pathname + location.search)
  })
}

instantClick.on('change', function() {
  qs('.js-form-post', (element) => {
    element.addEventListener('submit', postMessage)
  })
  qs('.js-form-post .form__textarea', (element) => {
    element.addEventListener('input', readyFormToPost)
  })
  isFormReadyToPost = false
  qs('.form__textarea', readyFormToPost) // The form can be filled on page change if it's after a refresh

  qsa('.js-favorite-toggle', (element) => {
    element.addEventListener('click', alertPlaceholder)
  })

  qsa('.js-go-to-form', (element) => {
    element.addEventListener('click', goToForm)
  })

  qs('.menu-mobile', (element) => {
    element.addEventListener('click', toggleMobileMenu)
  })

  syncFavorites()

  makeFavoritesSlideable()

  qsa('script[type=queued]', (element) => {
    eval(element.textContent)
  })

  /* Below: same as in 'restore' */
  insertStickerIntoMessage()
  startRefreshCycle()
})

document.documentElement.addEventListener('mouseover', enlargeEmoji)

addMessagesEvent('.spoil', 'click', toggleSpoil)
addMessagesEvent('.message__content-text > .quote > .quote > .quote', 'click', showImbricatedQuote)
addMessagesEvent('.js-quote', 'click', quoteMessage)
addMessagesEvent('.js-menu', 'click', toggleMenu)
addMessagesEvent('', 'click', closeMenu)

document.body.addEventListener('touchstart', setAsHavingTouch)

instantClick.on('restore', function () {
  insertStickerIntoMessage()
  startRefreshCycle()
})
