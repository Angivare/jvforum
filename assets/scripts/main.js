let $hasTouch = false
  , $lastRefreshTimestamp = 0
  , $messagesDeleted = []
  , $refreshInterval
  , $isSliderSliding = false
  , $sliderTopOffset = 0
  , $stickerPackWidth
  , $stickerDemoWidth
  , $isIOS = /\((iPhone|iPod|iPad)/.test(navigator.userAgent)
  , $selectedHeadPackId
  , $toastTimer
  , $savedMessageContentBeforeEditing
  , $previousPageDraftIdMentioned
  , $isPageVisible
  , $unviewedNewMessagesCount = 0
  , $originalTabTitle

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
  data._csrf = $csrf
  data = JSON.stringify(data)

  let xhr = new XMLHttpRequest()
  instantclick.xhr(xhr)
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
  $hasTouch = true
  instantclick.removeEvent('body', 'touchstart', setAsHavingTouch)
}

function showError(error, form = 'post') {
  qs(`.js-form-${form}__error`).innerHTML = error
  qs(`.js-form-${form}__error`).classList.add('form__error--shown')
}

function toggleSpoil(event) {
  if (event.target.matches('a, .sticker, .noelshack-link__thumb, .emoji')) {
    return
  }
  event.stopPropagation()
  this.classList.toggle('spoil--revealed')
}

function submitPost(event) {
  event.preventDefault()

  let message = qs('.js-form-post__textarea').value

  qs('.js-form-post__button-visible').classList.add('form__post-button-visible--sending')
  qs('.form__post-button').blur()

  let formData = {
        message,
        forumId: $forumId,
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
    formData.forumSlug = $forumSlug
  }
  else {
    formData.topicMode = $topicMode
    formData.topicIdLegacyOrModern = $topicIdLegacyOrModern
    formData.topicSlug = $topicSlug
  }

  ajax(isNewTopic ? 'postTopic' : 'postMessage', $timeouts.postMessage, formData, (status, response, xhr) => {
    qs('.js-form-post__button-visible').classList.remove('form__post-button-visible--sending')

    if (status != 200) {
      showError(`Problème réseau. Le message a peut-être été envoyé.`)
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
    else if (!$hasTouch) {
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

  let isLastPage = false
  qs('.pagination-topic--bottom .pagination-topic__page:last-child .pagination-topic__page-link', (element) => {
    isLastPage = element.classList.contains('pagination-topic__page-link--active')
  })
  if (isLastPage || lastMessageAge < 5 * 60) {
    $refreshInterval = $refreshIntervals.recent
    instantclick.setInterval(restartRefreshIfNeeded, $refreshIntervals.check)
  }
  else {
    $refreshInterval = $refreshIntervals.old
  }
  if ($refreshInterval - $cacheAge < 0) {
    refresh()
  }
  else {
    instantclick.setTimeout(refresh, $refreshInterval - $cacheAge)
  }
}

function restartRefreshIfNeeded() {
  if ($lastRefreshTimestamp < +new Date - $refreshIntervals.check) {
    refresh()
  }
}

function getMessagesChecksums() {
  let messagesChecksums = {}
  qsa('.message', (element) => {
    messagesChecksums[element.id.substr(1)] = element.dataset.checksum
  })
  return messagesChecksums
}

function refresh() {
  $lastRefreshTimestamp = +new Date

  ajax('refresh', $timeouts.refresh, {
    forumId: $forumId,
    topicMode: $topicMode,
    topicIdLegacyOrModern: $topicIdLegacyOrModern,
    topicSlug: $topicSlug,
    topicPage: $topicPage,
    numberOfPages: $numberOfPages,
    messagesChecksums: getMessagesChecksums(),
  }, (status, response, xhr) => {
    if (status == 200) {
      if (response.error) {
        if (response.error == 'deleted' && $numberOfPages) { // non-zero $numberOfPages means we aren't already on an error page
          location.href = location.pathname
        }
        if (response.error.substr(0, 'redirect'.length) == 'redirect') {
          redirectTo = response.error.split('=')[1]
          location.href = redirectTo
        }
        return
      }

      if ($numberOfPages == 0 && response.numberOfPages) {
        // We're on an error page and there's no more error (such as a topic that's no longer deleted)
        location.href = location.pathname
      }

      for (let id in getMessagesChecksums()) {
        if (!(id in response.messages)) {
          visuallyDeleteMessage(id)
        }
      }

      for (let id in response.messages) {
        if ($messagesDeleted.indexOf(id) > -1) {
          continue
        }

        let message = response.messages[id]
          , messageElement = qs(`#m${id}`)

        if (!messageElement) { // New message
          continue
        }

        // Update
        messageElement.dataset.age = message.age
        qs(`#m${id} .js-date`).innerHTML = message.date
        if ('content' in message) {
          messageElement.dataset.checksum = message.checksum

          if (!qs(`#m${id} .js-content`).dataset.isBeingEdited) {
            qs(`#m${id} .js-content`).innerHTML = message.content
          }
        }
      }

      if ('newMessagesHTML' in response) {
        for (let element of stringToElements(response.newMessagesHTML)) {
          if ($messagesDeleted.indexOf(element.dataset.id) == -1) {
            qs('.messages-list').appendChild(element)
          }
          if (!element.dataset.mine) {
            triggerTabAlertForNewPosts()
          }
        }
        updateTopicPosition()
      }

      if ('paginationHTML' in response) {
        qsa('.pagination-topic__pages', (element) => {
          element.innerHTML = response.paginationHTML
        })
        $numberOfPages = response.numberOfPages
        triggerTabAlertForNewPosts(true)
      }
    }

    if (!xhr.instantclickAbort) {
      instantclick.setTimeout(refresh, $refreshInterval)
    }
  })
}

function syncFavorites() {
  ajax('syncFavorites', $timeouts.syncFavorites)
}

function getAjaxHashes() {
  ajax('getAjaxHashes', $timeouts.syncFavorites, {}, (status, response, xhr) => {
    if (status == 200 && !response.error) {
      localStorage.hasAjaxHashes = +new Date
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
  instantclick.addPageEvent('resize', setSliderTopOffset)

  adjustSliderWidth()
  instantclick.addPageEvent('resize', adjustSliderWidth)

  makeFavoritesSlide()
  instantclick.addPageEvent('scroll', makeFavoritesSlide)
  instantclick.addPageEvent('resize', makeFavoritesSlide)
}

function setSliderTopOffset() {
  $sliderTopOffset = qs('.js-favorites-forums').getBoundingClientRect().bottom + scrollY
}

function adjustSliderWidth() {
  // Because it doesn't inherit its width parent in fixed position
  qs('.js-slider').style.width = qs('.menu.js-favorites-forums').offsetWidth + 'px'
}

function makeFavoritesSlide() {
  if ($sliderTopOffset > 0 && scrollY > $sliderTopOffset) {
    if (!$isSliderSliding) {
      qs('.js-slider').classList.add('sliding')
      $isSliderSliding = true
    }
  }
  else {
    if ($isSliderSliding) {
      qs('.js-slider').classList.remove('sliding')
      $isSliderSliding = false
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

  let stickersPerLine = Math.trunc($stickerPackWidth / $stickerDemoWidth)
    , stickersCountOnLastLine = stickersCount % stickersPerLine

  packElement.dataset.stickersCountOnLastLine = stickersCountOnLastLine
  if (stickersCountOnLastLine == 0) {
    packElement.lastElementChild.style.marginRight = `0`
    return
  }

  let marginUsedOnFullLines = $stickerPackWidth % $stickerDemoWidth
    , marginUsedOnLastLine = stickersCountOnLastLine * (marginUsedOnFullLines / stickersPerLine)

  let marginRight = $stickerPackWidth - (stickersCountOnLastLine * $stickerDemoWidth) - marginUsedOnLastLine
  packElement.lastElementChild.style.marginRight = `${marginRight}px`
}

function alignAllStickerPacks() {
  let newStickerPackWidth = qs('.stickers-pack').getBoundingClientRect().width
  if (newStickerPackWidth == $stickerPackWidth) {
    return
  }
  $stickerPackWidth = newStickerPackWidth
  $stickerDemoWidth = qs('.stickers-pack__sticker').getBoundingClientRect().width
  qsa('.stickers-pack', alignStickerPack)
}

function noteStickerAndGoBack(event) {
  localStorage.stickerToInsert = event.target.dataset.stickerId
  history.back()
}

function setUpStickers() {
  $stickerPackWidth = undefined
  $selectedHeadPackId = 0
  instantclick.addPageEvent('resize', alignAllStickerPacks)
  alignAllStickerPacks()
  qs('.stickers-heads-container').scrollTop = 9999

  instantclick.addEvent('.stickers-pack__sticker', 'click', noteStickerAndGoBack)

  instantclick.addPageEvent('scroll', selectHead)
  selectHead()

  instantclick.addEvent('.stickers-heads__head', 'click', stickerHeadOnClick)
}

function selectHead() {
  let packId = 1
    , heads = []
  qsa('.stickers-pack', (element) => {
    if (element.getBoundingClientRect().bottom - innerHeight >= -30) {
      packId = parseInt(element.dataset.packId)
    }
  })
  if (packId == $selectedHeadPackId) {
    return
  }
  if ($selectedHeadPackId) {
    qs(`.js-stickers-head-${$selectedHeadPackId}`).classList.remove('stickers-heads__head--selected')
  }
  qs(`.js-stickers-head-${packId}`).classList.add('stickers-heads__head--selected')
  $selectedHeadPackId = packId
}

function stickerHeadOnClick(event) {
  let packId = this.dataset.packId
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
  if ($isIOS) {
    /* iOS doesn't want to focus the form, so selectionEnd isn't updated.
     * We get around this by stupidly adding the sticker at the end.
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

function showImbricatedQuote() {
  this.classList.add('quote--imbricated-shown')
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

function enlargeEmoji() {
  let image = this.src.split('/').pop()
    , alt = this.alt

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

function enlargeSticker() {
  let id = this.dataset.stickerId
    , packId = this.dataset.packId

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
    element = this
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
    qs(`#m${idEdited} .js-content`).innerHTML = $savedMessageContentBeforeEditing

    if (id == idEdited) {
      return
    }
  }

  let html = qs(`#m${id} .message__content-text`).innerHTML.trim()
    , text = html2jvcode(html)

  $savedMessageContentBeforeEditing = qs(`#m${id} .js-content`).innerHTML
  qs(`#m${id} .js-content`).innerHTML = qs('.js-form-edit-template').innerHTML
  qs(`#m${id} .js-content`).dataset.isBeingEdited = true

  let textarea = qs('.js-form-edit__textarea')

  textarea.focus() // Must be before setting value in order to have the cursor at the bottom
  textarea.value = text
}

function submitEdit(event) {
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

  ajax('editMessage', $timeouts.postMessage, {
    messageId,
    message,
    forumId: $forumId,
    topicMode: $topicMode,
    topicIdLegacyOrModern: $topicIdLegacyOrModern,
    topicSlug: $topicSlug,
  }, (status, response, xhr) => {
    qs('.js-form-edit__button-visible').classList.remove('form__post-button-visible--sending')

    if (status != 200) {
      showError(`Problème réseau. La modification a peut-être été faite.`, 'edit')
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
  })
}

function showToast(message, durationInSeconds = 2.5) {
  instantclick.clearTimeout($toastTimer)
  $('.toast').addClass('toast--shown')
  $('.toast__label').text(message)
  $toastTimer = instantclick.setTimeout(hideToast, durationInSeconds * 1000)
}

function hideToast() {
  $('.toast').removeClass('toast--shown')
  $toastTimer = instantclick.setTimeout(function() {
    $('.toast__label').text(' ')
  }, 150)
}

function visuallyDeleteMessage(id) {
  $messagesDeleted.push(id)
  qs(`#m${id}`).classList.add('message--animating-its-deletion')
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

  ajax('deleteMessage', $timeouts.postMessage, {
    messageId: id,
  }, (status, response, xhr) => {
    if (status != 200) {
      showToast(`Problème réseau lors de la suppression, le message n’a peut-être pas été supprimé.`, 3)
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
  ajax('topicPosition', $timeouts.topicPosition, {
    topicIdModern,
    messageId: lastMessage.dataset.id,
    answersCount: ($topicPage - 1) * 20 + document.querySelectorAll('.message').length - 1,
  })
}

function saveDraftForum() {
  let draftId = `draft_${$forumId}`
    , value = qs('.js-form-post__title').value + '__jvforum_draft_delimiter__' + qs('.js-form-post__textarea').value

  if (value == '__jvforum_draft_delimiter__') {
    localStorage.removeItem(draftId)
    return
  }

  localStorage[draftId] = value
  qs('.js-form-post__draft-mention').classList.remove('form__draft-mention--visible')
  $previousPageDraftIdMentioned = draftId
}

function saveDraftTopic() {
  let draftId = `draft_${$topicIdModern}`
    , value = qs('.js-form-post__textarea').value

  if (!value) {
    localStorage.removeItem(draftId)
    return
  }

  localStorage[draftId] = value
  qs('.js-form-post__draft-mention').classList.remove('form__draft-mention--visible')
  $previousPageDraftIdMentioned = draftId
}

function saveDraft() {
  if (qs('.js-form-post__title')) {
    saveDraftForum()
  }
  else {
    saveDraftTopic()
  }
}

function showDraft() {
  if (!qs('.js-form-post')) {
    $previousPageDraftIdMentioned = null
    return
  }
  let hasTitle = qs('.js-form-post__title')
    , draftId = `draft_${hasTitle ? $forumId : $topicIdModern}`
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
  if (draftId != $previousPageDraftIdMentioned) {
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
      $previousPageDraftIdMentioned = draftId
    })
  }
}

function handleVisibilityState() {
  $isPageVisible = document.visibilityState == 'visible'
  if ($isPageVisible) {
    removeTabAlertForNewPosts()
  }
}

function triggerTabAlertForNewPosts(hasNewPage) {
  if ($isPageVisible) {
    return
  }
  if (hasNewPage) {
    if ($unviewedNewMessagesCount < 100000) {
      $unviewedNewMessagesCount += 100000
    }
  }
  else {
    $unviewedNewMessagesCount++
  }
  let newMessagesOnPage = $unviewedNewMessagesCount % 100000
    , titleInfo = '(' + (newMessagesOnPage > 0 ? newMessagesOnPage : '') + ($unviewedNewMessagesCount >= 100000 ? '+' : '') + ')'
  document.title = `${titleInfo} ${$originalTabTitle}`
}

function removeTabAlertForNewPosts() {
  if ($unviewedNewMessagesCount) {
    document.title = $originalTabTitle
    $unviewedNewMessagesCount = 0
  }
}

function toggleFavorite(event) {
  let id = $topicIdModern ? $topicIdModern : $forumId
    , action = this.dataset.action
    , formData = {}
  formData[action] = id
  ajax('favorite', $timeouts.syncFavorites, formData, (status, response, xhr) => {
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
  showToast(($topicIdModern ? 'Topic' : 'Forum') + ' ' + (action == 'add' ? 'ajouté aux' : 'retiré des') + ' favoris.')
  localStorage.removeItem('toggledFavoriteAction')
}

instantclick.addEvent('.js-form-post', 'submit', submitPost)
instantclick.addEvent('.js-form-post__title', 'input', saveDraftForum)
instantclick.addEvent('.js-form-post__textarea', 'input', saveDraft)
instantclick.addEvent('.js-go-to-form', 'click', goToForm)
instantclick.addEvent('.menu-mobile', 'click', toggleMobileMenu)
instantclick.addEvent('.js-logout-link', 'click', logout)

instantclick.addEvent('.emoji', 'click', enlargeEmoji)
instantclick.addEvent('.js-sticker', 'click', enlargeSticker)
instantclick.addEvent('.js-edit', 'click', showEditForm)
instantclick.addEvent('.js-favorite-toggle', 'click', toggleFavorite)

instantclick.addEvent('.spoil', 'click', toggleSpoil)
instantclick.addEvent('.message__content-text > .quote > .quote > .quote', 'click', showImbricatedQuote)
instantclick.addEvent('.js-quote', 'click', quoteMessage)
instantclick.addEvent('.js-menu', 'click', toggleMenu)
instantclick.addEvent('.js-delete', 'click', confirmDeleteMessage)
instantclick.addEvent('.message', 'click', closeMenu)

instantclick.addEvent('.js-form-edit', 'submit', submitEdit)

instantclick.addEvent('body', 'touchstart', setAsHavingTouch)

document.addEventListener('visibilitychange', handleVisibilityState)
handleVisibilityState()

if (!localStorage.hasAjaxHashes || localStorage.hasAjaxHashes.length == 1) {
  getAjaxHashes()
}

instantclick.init()

instantclick.on('change', function() {
  showDraft()

  syncFavorites()

  makeFavoritesSlideable()

  qsa('script[type=queued]', (element) => {
    eval(element.textContent)
  })

  updateTopicPosition()

  $originalTabTitle = document.title

  showFavoriteToggleConfirmation()

  if (qs('.forum-search__input')) {
    qs('.forum-search__input').focus()
  }

  startRefreshCycle()

  /* Below: same as in 'restore' */
  insertStickerIntoMessage()
})

instantclick.on('restore', function () {
  insertStickerIntoMessage()
})

if ($googleAnalyticsId) {
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
  ga('create', $googleAnalyticsId, 'auto');

  instantclick.on('change', function() {
    ga('set', 'dimension1', 'Member')
    ga('send', 'pageview', location.pathname + location.search)
  })
}
