let hasTouch = false
  , refreshTimeout
  , lastRefreshTimestamp = 0
  , messagesChecksums
  , messagesDeleted = []
  , refreshInterval
  , messagesEvents = []
  , isSliderSliding = false
  , sliderTopOffset = 0
  , stickerPackWidth
  , stickerDemoWidth
  , isIOS = /\((iPhone|iPod|iPad)/.test(navigator.userAgent)
  , selectedHeadPackId
  , toastTimer
  , savedMessageContentBeforeEditing
  , previousPageDraftIdMentioned
  , pageVisible
  , unviewedNewMessagesCount = 0
  , originalTabTitle

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

function ajax(shortPath, timeout, data = {}, callback = () => {}) {
  data._csrf = _csrf
  data = JSON.stringify(data)

  let xhr = instantClick.xhr()
  xhr.open('POST', `/ajax/${shortPath}`)
  xhr.timeout = timeout
  xhr.setRequestHeader('Content-Type', 'application/json')
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

function attachEvent(selectors, type, listener, stepsLimit = 9999) {
  document.documentElement.addEventListener(type, (event) => {
    let element = event.target
      , steps = 0
    while (element.nodeType == 1 && steps < stepsLimit) {
      if (element.matches(selectors)) {
        listener.call(element, event)
        break
      }
      element = element.parentNode
      steps++
    }
  })
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
  document.documentElement.classList.remove('hasnt-touch')
  document.documentElement.classList.add('has-touch')
  hasTouch = true
  document.body.removeEventListener('touchstart', setAsHavingTouch)
}

function showError(error, form = 'post') {
  qs(`.js-form-${form}__error`).innerHTML = error
  qs(`.js-form-${form}__error`).classList.add('form__error--shown')
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
  if (target.matches('a, .sticker, .noelshack-link__thumb')) {
    return
  }
  this.classList.toggle('spoil--revealed')
}

function postMessage(event) {
  event.preventDefault()

  let message = qs('.js-form-post__textarea').value

  qs('.js-form-post__button-visible').classList.add('form__post-button-visible--sending')
  qs('.form__post-button').blur()

  let formData = {
        message,
        forumId,
        userAgent: navigator.userAgent,
        canvasWidth: innerWidth,
        canvasHeight: innerHeight,
        screenWidth: screen.width,
        screenHeight: screen.height,
      }
    , isNewTopic = false

  if (qs('.js-form-post__title')) {
    isNewTopic = true
    formData.title = qs('.js-form-post__title').value
    formData.forumSlug = forumSlug
  }
  else {
    formData.topicMode = topicMode
    formData.topicIdLegacyOrModern = topicIdLegacyOrModern
    formData.topicSlug = topicSlug
  }

  ajax(isNewTopic ? 'postTopic' : 'postMessage', timeouts.postMessage, formData, (status, response, xhr) => {
    qs('.js-form-post__button-visible').classList.remove('form__post-button-visible--sending')

    if (status != 200) {
      showError(`Problème réseau`)
      return
    }
    if (response.error) {
      showError(response.error)
      return
    }

    qs('.js-form-post__error').classList.remove('form__error--shown')
    if (isNewTopic) {
      qs('.js-form-post__title').value = ''
      qs('.js-form-post__textarea').value = ''
      saveDraftForum()
    }
    else {
      qs('.js-form-post__textarea').value = ''
      saveDraftTopic()
    }

    if (isNewTopic) {
      location.href = response.location
    }
    else if (!hasTouch) {
      qs('.js-form-post__textarea').focus()
    }
  })
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
  if (refreshInterval - cacheAge < 0) {
    refresh()
  }
  else {
    instantClick.setTimeout(refresh, refreshInterval - cacheAge)
  }
}

function restartRefreshIfNeeded() {
  if (lastRefreshTimestamp < +new Date - refreshIntervals.check) {
    refresh()
  }
}

function refresh() {
  lastRefreshTimestamp = +new Date

  ajax('refresh', timeouts.refresh, {
    forumId,
    topicMode,
    topicIdLegacyOrModern,
    topicSlug,
    topicPage,
    numberOfPages,
    messagesChecksums,
  }, (status, response, xhr) => {
    if (status == 200) {
      if (response.error) {
        if (response.error == 'deleted' && numberOfPages) { // non-zero numberOfPages means we're not already on an error page
          location.href = location.pathname
        }
        if (response.error.substr(0, 'redirect'.length) == 'redirect') {
          redirectTo = response.error.split('=')[1]
          location.href = redirectTo
        }
        return
      }

      if (numberOfPages == 0 && response.numberOfPages) {
        // We're on an error page and there's no more error (such as a topic that's no longer deleted)
        location.href = location.pathname
      }

      if ('newMessagesHTML' in response) {
        for (let element of stringToElements(response.newMessagesHTML)) {
          if (messagesDeleted.indexOf(element.dataset.id) == -1) {
            qs('.messages-list').appendChild(element)
          }
          if (!element.dataset.mine) {
            triggerTabAlertForNewPosts()
          }
        }
      }

      for (let id in messagesChecksums) {
        if (!(id in response.messages)) {
          visuallyDeleteMessage(id)
        }
      }

      for (let id in response.messages) {
        if (messagesDeleted.indexOf(id) > -1) {
          continue
        }

        let message = response.messages[id]

        if (!(id in messagesChecksums)) {
          // New message
          messagesChecksums[id] = message.checksum

          for (let i = 0; i < messagesEvents.length; i++) {
            qsa(`#m${id} ${messagesEvents[i].element}`, (element) => {
              element.addEventListener(messagesEvents[i].type, messagesEvents[i].listener)
            })
          }
          updateTopicPosition()
          continue
        }

        // Update
        qs(`#m${id}`).dataset.age = message.age
        qs(`#m${id} .js-date`).innerHTML = message.date
        if ('content' in message) {
          qs(`#m${id}`).dataset.checksum = message.checksum
          messagesChecksums[id] = message.checksum

          if (!qs(`#m${id} .js-content`).dataset.isBeingEdited) {
            qs(`#m${id} .js-content`).innerHTML = message.content
          }

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
        triggerTabAlertForNewPosts(true)
      }
    }

    if (!xhr.instantKilled) {
      instantClick.setTimeout(refresh, refreshInterval)
    }
  })
}

function syncFavorites() {
  ajax('syncFavorites', timeouts.syncFavorites)
}

function getAjaxHashes() {
  ajax('getAjaxHashes', timeouts.syncFavorites, {}, (status, response, xhr) => {
    if (status == 200 && !response.error) {
      localStorage.hasAjaxHashes = '1'
      localStorage.removeItem('hasAjaxHash') // legacy
    }
  })
}

function makeFavoritesSlideable() {
  if (screen.width < 1025) {
    return
  }

  if (!qs('.js-slider')) {
    return
  }

  setSliderTopOffset()
  instantClick.addPageEvent('resize', setSliderTopOffset)

  adjustSliderWidth()
  instantClick.addPageEvent('resize', adjustSliderWidth)

  makeFavoritesSlide()
  instantClick.addPageEvent('scroll', makeFavoritesSlide)
  instantClick.addPageEvent('resize', makeFavoritesSlide)
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
  qs('.js-form-post__textarea').focus()
  scrollTo(0, qs('.js-form-post').getBoundingClientRect().top + scrollY)
}

function toggleMobileMenu() {
  qs('.menu-mobile__opener').classList.toggle('menu-mobile__opener--hidden')
  qs('.canvas').classList.toggle('canvas--under-stage-with-menu-mobile-items')
  let addOrRemoveEvent = qs('.canvas').classList.contains('canvas--under-stage-with-menu-mobile-items') ? 'add' : 'remove'
  qs('.stage')[`${addOrRemoveEvent}EventListener`]('click', toggleMobileMenu)
  qs('.stage').classList.toggle('stage--shown')
  qs('.stage').classList.toggle('stage--menu-mobile-items')
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
  instantClick.addPageEvent('resize', alignAllStickerPacks)
  alignAllStickerPacks()
  qs('.stickers-heads-container').scrollTop = 9999

  qsa('.stickers-pack__sticker', (element) => {
    element.addEventListener('click', noteStickerAndGoBack)
  })

  instantClick.addPageEvent('scroll', selectHead)
  selectHead()

  qsa('.stickers-heads__head', (element) => {
    element.addEventListener('click', stickerHeadOnClick)
  })
}

function selectHead() {
  let packId = 1
    , heads = []
  qsa('.stickers-pack', (element) => {
    if (element.getBoundingClientRect().bottom - innerHeight >= -30) {
      packId = parseInt(element.dataset.packId)
    }
  })
  if (packId == selectedHeadPackId) {
    return
  }
  if (selectedHeadPackId) {
    qs(`.js-stickers-head-${selectedHeadPackId}`).classList.remove('stickers-heads__head--selected')
  }
  qs(`.js-stickers-head-${packId}`).classList.add('stickers-heads__head--selected')
  selectedHeadPackId = packId
}

function stickerHeadOnClick(event) {
  let element = event.currentTarget
    , packId = element.dataset.packId
    , scrollPosition = qs(`.js-stickers-pack-${packId}`).getBoundingClientRect().bottom + scrollY - innerHeight
  scrollTo(0, scrollPosition)
}

function insertStickerIntoMessage() {
  if (!localStorage.stickerToInsert) {
    return
  }
  let textarea = qs('.js-form-edit__textarea') || qs('.js-form-post__textarea')
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
  localStorage.removeItem('stickerToInsert')
  saveDraft()
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
  if (qs(`#m${id} .js-content`).dataset.isBeingEdited) {
    return
  }
  let textarea = qs('.js-form-edit__textarea') || qs('.js-form-post__textarea')
    , html = qs(`#m${id} .message__content-text`).innerHTML.trim()
    , text = html2jvcode(html)
    , quote = ''
  if (textarea && textarea.value) {
    if (!/\n\n$/.test(textarea.value)) {
      quote += "\n\n"
    }
  }
  quote += `> '''${nickname}''' [[date:${timestamp}]] :\n`
  quote += `> \n`
  quote += `> ${text.split("\n").join("\n> ")}`
  quote += "\n\n"

  if (textarea) {
    textarea.focus() // Must be before setting value in order to have the cursor at the bottom
    textarea.value += quote
    saveDraft()
  }
  else {
    showEditForm(id)
    textarea = qs('.js-form-edit__textarea')
    showError('Topic bloqué, copiez-collez le message pour le citer ailleurs.', 'edit')
    textarea.focus() // Must be before setting value in order to have the cursor at the bottom
    textarea.value = quote
  }
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
  let element = event.target
  if (!element.classList.contains('emoji')) {
    return
  }

  let image = element.src.split('/').pop()
    , alt = element.alt

  qs('.stage').innerHTML = `
    <div class="stage-sticker-container">
      <div class="stage-sticker-container__top-padding"></div>
      <div class="stage-sticker-container__sticker">
        <div class="stage-sticker-sd-container">
          <img class="stage-sticker-sd sticker sticker--pack-emoji" style="---width: 160px; ---height: 160px;" src="/assets/emoji/40/${image}">
        </div>
        <img class="stage-sticker-hd sticker sticker--pack-emoji" style="---width: 160px; ---height: 160px;" src="/assets/emoji/160/${image}">
      </div>
    </div>
  `

  qs('.canvas').classList.add('canvas--under-stage-with-sticker')
  qs('.stage').addEventListener('click', quitEnlargedSticker)
  qs('.stage').classList.add('stage--shown')
  qs('.stage').classList.add('stage--sticker')

  let bigSticker = qs('.stage-sticker-hd')
  if (bigSticker.complete) {
    qs('.stage-sticker-sd-container').classList.add('stage-sticker-sd-container--hidden')
  }
  else {
    bigSticker.addEventListener('load', () => {
      qs('.stage-sticker-sd-container').classList.add('stage-sticker-sd-container--hidden')
    })
  }
}

function enlargeSticker(event) {
  let element = event.target
  if (!element.classList.contains('js-sticker')) {
    return
  }
  let id = element.dataset.stickerId
    , packId = element.dataset.packId

    // put sticker image (small for now) and code
  qs('.stage').innerHTML = `
    <div class="stage-sticker-container">
      <div class="stage-sticker-container__top-padding"></div>
      <div class="stage-sticker-container__sticker">
        <div class="stage-sticker-sd-container">
          <img class="stage-sticker-sd sticker sticker--pack-${packId}" style="---width: 560px; ---height: 560px;" src="/assets/stickers/v2/${id}">
        </div>
        <img class="stage-sticker-hd sticker sticker--pack-${packId}" style="---width: 560px; ---height: 560px;" src="/assets/stickers/big/${id}">
      </div>
      <div class="stage-sticker-container__code">
        <div class="stage-sticker-code">:${id}:</div>
      </div>
    </div>
  `

  qs('.canvas').classList.add('canvas--under-stage-with-sticker')
  qs('.stage').addEventListener('click', quitEnlargedSticker)
  qs('.stage').classList.add('stage--shown')
  qs('.stage').classList.add('stage--sticker')

  let bigSticker = qs('.stage-sticker-hd')
  if (bigSticker.complete) {
    qs('.stage-sticker-sd-container').classList.add('stage-sticker-sd-container--hidden')
  }
  else {
    bigSticker.addEventListener('load', () => {
      qs('.stage-sticker-sd-container').classList.add('stage-sticker-sd-container--hidden')
    })
  }
}

function quitEnlargedSticker() {
  qs('.canvas').classList.remove('canvas--under-stage-with-sticker')
  qs('.stage').removeEventListener('click', quitEnlargedSticker)
  qs('.stage').classList.remove('stage--shown')
  qs('.stage').classList.remove('stage--sticker')
}

function showEditForm(eventOrMessageId) {
  let element
  if (typeof eventOrMessageId != 'object') {
    element = qs(`#m${eventOrMessageId}`)
  }
  else {
    element = eventOrMessageId.target
    if (!element.classList.contains('js-edit')) {
      return
    }
    while (!element.id) {
      element = element.parentNode
    }
  }
  let {id, nickname, timestamp} = element.dataset
  let alreadyEditedForm = qs('.js-form-edit')
  if (alreadyEditedForm) {
    delete alreadyEditedForm.parentNode.dataset.isBeingEdited

    let elementEdited = alreadyEditedForm
    while (!elementEdited.id) {
      elementEdited = elementEdited.parentNode
    }
    let idEdited = elementEdited.dataset.id
    qs(`#m${idEdited} .js-content`).innerHTML = savedMessageContentBeforeEditing
    for (let i = 0; i < messagesEvents.length; i++) {
      qsa(`#m${idEdited} ${messagesEvents[i].element}`, (element) => {
        element.addEventListener(messagesEvents[i].type, messagesEvents[i].listener)
      })
    }

    if (id == idEdited) {
      return
    }
  }

  let html = qs(`#m${id} .message__content-text`).innerHTML.trim()
    , text = html2jvcode(html)

  savedMessageContentBeforeEditing = qs(`#m${id} .js-content`).innerHTML
  qs(`#m${id} .js-content`).innerHTML = qs('.js-form-edit-template').innerHTML
  qs(`#m${id} .js-content`).dataset.isBeingEdited = true

  let textarea = qs('.js-form-edit__textarea')

  textarea.focus() // Must be before setting value in order to have the cursor at the bottom
  textarea.value = text

  qs('.js-form-edit').addEventListener('submit', editMessage)
}

function editMessage(event) {
  event.preventDefault()

  let message = qs('.js-form-edit__textarea').value

  if (message.length == 0) {
    qs('.js-form-edit__textarea').focus()
    return
  }

  qs('.js-form-edit__button-visible').classList.add('form__post-button-visible--sending')
  qs('.form__post-button').blur()

  let element = event.target
  while (!element.id) {
    element = element.parentNode
  }
  let messageId = element.dataset.id

  ajax('editMessage', timeouts.postMessage, {
    messageId,
    message,
    forumId,
    topicMode,
    topicIdLegacyOrModern,
    topicSlug,
  }, (status, response, xhr) => {
    qs('.js-form-edit__button-visible').classList.remove('form__post-button-visible--sending')

    if (status != 200) {
      showError(`Problème réseau`, 'edit')
      return
    }
    if (response.error) {
      showError(response.error, 'edit')
      return
    }

    qs('.js-form-edit__error').classList.remove('form__error--shown')
    qs('.js-form-edit__textarea').value = ''

    delete qs(`#m${messageId} .js-content`).dataset.isBeingEdited

    qs(`#m${messageId} .js-content`).innerHTML = response.content

    qs(`#m${messageId}`).dataset.checksum = response.checksum
    messagesChecksums[messageId] = response.checksum
  })
}

function showToast(message, durationInSeconds = 2.5) {
  clearTimeout(toastTimer)
  $('.toast').addClass('toast--shown')
  $('.toast__label').text(message)
  toastTimer = instantClick.setTimeout(hideToast, durationInSeconds * 1000)
}

function hideToast() {
  $('.toast').removeClass('toast--shown')
  toastTimer = instantClick.setTimeout(function() {
    $('.toast__label').text(' ')
  }, 150)
}

function visuallyDeleteMessage(id) {
  messagesDeleted.push(id)
  qs(`#m${id}`).classList.add('message--being-deleted')
  delete messagesChecksums[id]
  setTimeout((id) => {
    qs(`#m${id}`).remove()
  }, 200, id)
}

function confirmDeleteMessage(event) {
  if (!confirm('Supprimer ce message ?')) {
    return
  }
  let element = event.target
  while (!element.id) {
    element = element.parentNode
  }
  let id = element.dataset.id
  visuallyDeleteMessage(id)

  ajax('deleteMessage', timeouts.postMessage, {
    messageId: id,
  }, (status, response, xhr) => {
    if (status != 200) {
      showToast(`Problème réseau lors de la suppression du message`, 3)
      return
    }
    if (response.error) {
      showToast(`Problème lors de la suppression du message : ${response.error}`, 5)
      return
    }
  })
}

function logout(event) {
  if (!confirm('Vous déconnecter ?')) {
    event.preventDefault()
    return
  }
  localStorage.removeItem('hasAjaxHashes')
}

function updateTopicPosition() {
  let topicIdModern = document.body.dataset.topicIdModern
  if (!topicIdModern) {
    return
  }
  let lastMessage = qs('.message:last-child')
  if (!lastMessage) { // Deleted topic
    return
  }
  ajax('topicPosition', timeouts.topicPosition, {
    topicIdModern,
    messageId: lastMessage.dataset.id,
    answersCount: (topicPage - 1) * 20 + document.querySelectorAll('.message').length - 1,
  })
}

function saveDraftForum() {
  let draftId = `draft_${forumId}`
    , value = qs('.js-form-post__title').value + '__jvforum_draft_delimiter__' + qs('.js-form-post__textarea').value

  if (value == '__jvforum_draft_delimiter__') {
    localStorage.removeItem(draftId)
    return
  }

  localStorage[draftId] = value
  qs('.js-form-post__draft-mention').classList.remove('form__draft-mention--visible')
  previousPageDraftIdMentioned = draftId
}

function saveDraftTopic() {
  let draftId = `draft_${topicIdModern}`
    , value = qs('.js-form-post__textarea').value

  if (!value) {
    localStorage.removeItem(draftId)
    return
  }

  localStorage[draftId] = value
  qs('.js-form-post__draft-mention').classList.remove('form__draft-mention--visible')
  previousPageDraftIdMentioned = draftId
}

function showDraft() {
  let hasTitle = qs('.js-form-post__title')
    , draftId = `draft_${hasTitle ? forumId : topicIdModern}`
    , value = localStorage[draftId]
  if (!value) {
    return
  }
  if (hasTitle) {
    let [titleValue, messageValue] = value.split('__jvforum_draft_delimiter__')
    qs('.js-form-post__title').value = titleValue
    qs('.js-form-post__textarea').value = messageValue
  }
  else {
    qs('.js-form-post__textarea').value = value
  }
  if (draftId != previousPageDraftIdMentioned) {
    qs('.js-form-post__draft-mention').classList.add('form__draft-mention--visible')
    qs('.js-form-post__draft-mention-action').addEventListener('click', () => {
      if (hasTitle) {
        qs('.js-form-post__title').focus()
        qs('.js-form-post__title').value = ''
        qs('.js-form-post__textarea').value = ''
        saveDraftForum()
      }
      else {
        qs('.js-form-post__textarea').focus()
        qs('.js-form-post__textarea').value = ''
        saveDraftTopic()
      }
      qs('.js-form-post__draft-mention').classList.remove('form__draft-mention--visible')
      previousPageDraftIdMentioned = draftId
    })
  }
}

function handleVisibilityState() {
  pageVisible = document.visibilityState == 'visible'
  if (pageVisible) {
    removeTabAlertForNewPosts()
  }
}

function triggerTabAlertForNewPosts(hasNewPage) {
  if (pageVisible) {
    return
  }
  if (hasNewPage) {
    if (unviewedNewMessagesCount < 100000) {
      unviewedNewMessagesCount += 100000
    }
  }
  else {
    unviewedNewMessagesCount++
  }
  let newMessagesOnPage = unviewedNewMessagesCount % 100000
    , titleInfo = '(' + (newMessagesOnPage > 0 ? newMessagesOnPage : '') + (unviewedNewMessagesCount >= 100000 ? '+' : '') + ')'
  document.title = `${titleInfo} ${originalTabTitle}`
}

function removeTabAlertForNewPosts() {
  if (unviewedNewMessagesCount) {
    document.title = originalTabTitle
    unviewedNewMessagesCount = 0
  }
}

function toggleFavorite(event) {
  let id = topicIdModern ? topicIdModern : forumId
    , action = this.dataset.action
    , formData = {}
  formData[action] = id
  ajax('favorite', timeouts.syncFavorites, formData, (status, response, xhr) => {
    if (status != 200) {
      showToast('Problème réseau lors ' + (action == 'add' ? 'de l’ajout au' : 'du retrait des') + ' favoris.')
      return
    }
    if (response.error) {
      showToast('Erreur : ' + response.error)
      return
    }
    localStorage.toggledFavoriteAction = action
    location.reload()
  })
}

function showFavoriteToggleConfirmation() {
  let action = localStorage.toggledFavoriteAction
  if (!action) {
    return
  }
  showToast((topicIdModern ? 'Topic' : 'Forum') + ' ' + (action == 'add' ? 'ajouté aux' : 'retiré des') + ' favoris.')
  localStorage.removeItem('toggledFavoriteAction')
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

    let titleElement = qs('.js-form-post__title')
    if (titleElement) {
      titleElement.addEventListener('input', saveDraftForum)
      qs('.js-form-post__textarea').addEventListener('input', saveDraftForum)
    }
    else {
      qs('.js-form-post__textarea').addEventListener('input', saveDraftTopic)
    }
    showDraft()
  })
  if (!qs('.js-form-post')) {
    previousPageDraftIdMentioned = null
  }

  qsa('.js-go-to-form', (element) => {
    element.addEventListener('click', goToForm)
  })

  qs('.menu-mobile', (element) => {
    element.addEventListener('click', toggleMobileMenu)
  })

  qs('.js-logout-link', (element) => {
    element.addEventListener('click', logout)
  })

  syncFavorites()

  makeFavoritesSlideable()

  qsa('script[type=queued]', (element) => {
    eval(element.textContent)
  })

  updateTopicPosition()

  originalTabTitle = document.title

  showFavoriteToggleConfirmation()

  if (qs('.forum-search__input')) {
    qs('.forum-search__input').focus()
  }

  /* Below: same as in 'restore' */
  insertStickerIntoMessage()
  startRefreshCycle()
})

document.documentElement.addEventListener('click', enlargeEmoji)
document.documentElement.addEventListener('click', enlargeSticker)
document.documentElement.addEventListener('click', showEditForm)
attachEvent('.js-favorite-toggle', 'click', toggleFavorite, 2)

addMessagesEvent('.spoil', 'click', toggleSpoil)
addMessagesEvent('.message__content-text > .quote > .quote > .quote', 'click', showImbricatedQuote)
addMessagesEvent('.js-quote', 'click', quoteMessage)
addMessagesEvent('.js-menu', 'click', toggleMenu)
addMessagesEvent('.js-delete', 'click', confirmDeleteMessage)
addMessagesEvent('', 'click', closeMenu)

document.body.addEventListener('touchstart', setAsHavingTouch)

document.addEventListener('visibilitychange', handleVisibilityState)
handleVisibilityState()

if (!('hasAjaxHashes' in localStorage)) {
  getAjaxHashes()
}

instantClick.on('restore', function () {
  insertStickerIntoMessage()
  startRefreshCycle()
})
