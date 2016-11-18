let isFormReadyToPost = false
  , hasTouch = false
  , refreshTimeout
  , lastRefreshTimestamp = 0
  , messagesChecksums
  , refreshInterval
  , messagesEvents = []
  , isSliderSliding = false
  , sliderTopOffset = 0

function qs(selectors) {
  return document.querySelector(selectors)
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
    if (!$('.form__textarea').val().trim()) {
      isFormReadyToPost = false
      $('.button-mobile-post__visible').removeClass('button-mobile-post__visible--ready-to-post')
      return
    }
  }

  if ($('.form__textarea').val().trim()) {
    $('.button-mobile-post__visible').addClass('button-mobile-post__visible--ready-to-post')
    isFormReadyToPost = true
  }
}

function startRefreshCycle() {
  let lastMessageAge = $('.message').last().data('age')
  if (lastMessageAge == undefined) { // No messages on the page due to a bug with JVC
    lastMessageAge = 0
  }

  messagesChecksums = {}
  $('.message').each(function(index, element) {
    messagesChecksums[element.id] = $(element).data('checksum')
  })

  let isLastPage = $('.pagination-topic__page-link').last().hasClass('pagination-topic__page-link--active')
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
  let data = {
    forumId: forumId,
    topicMode: topicMode,
    topicIdLegacyOrModern: topicIdLegacyOrModern,
    topicSlug: topicSlug,
    topicPage: topicPage,
    numberOfPages: numberOfPages,
    messagesChecksums: JSON.stringify(messagesChecksums),
    _csrf: _csrf,
  }

  instantClick.xhr($.post({
    url: '/ajax/refresh',
    data: data,
    timeout: timeouts.refresh,
  })
  .done(function(data, textStatus, jqXHR) {
    if (data.error) {
      if (data.error == 'deleted' && numberOfPages) { // non-zero numberOfPages means we're not already on an error page
        location.href = location.pathname
      }
      return
    }

    if (numberOfPages == 0 && data.numberOfPages) {
      // We're on an error page and there's no more error (such as a topic that's no longer deleted)
      location.href = location.pathname
    }

    if ('newMessagesHTML' in data) {
      $('.messages-list').append(data.newMessagesHTML)
    }

    for (let id in data.messages) {
      let message = data.messages[id]

      if (!(id in messagesChecksums)) {
        // New message
        messagesChecksums[id] = message.checksum
        for (let i = 0; i < messagesEvents.length; i++) {
          $('#' + id + ' ' + messagesEvents[i].element)[messagesEvents[i].type](messagesEvents[i].listener)
        }
        continue
      }

      // Update
      $('#' + id).data('age', message.age)
      $('#' + id + ' .js-date').html(message.date)
      if ('content' in message) {
        $('#' + id).data('checksum', message.checksum)
        messagesChecksums[id] = message.checksum

        $('#' + id + ' .js-content').html(message.content)
        $('#' + id + ' .spoil').click(toggleSpoil)
      }
    }

    if ('paginationHTML' in data) {
      $('.pagination-topic__pages').html(data.paginationHTML)
      numberOfPages = data.numberOfPages
    }
  })
  .always(function (_, textStatus) {
    if (textStatus != 'abort') { // Not an InstantClick page change
      instantClick.setTimeout(refresh, refreshInterval)
    }
  }))
}

function syncFavorites() {
  ajax('/ajax/syncFavorites', timeouts.syncFavorites)
}

function setSliderTopOffset() {
  sliderTopOffset = $('.js-slider').offset().top - 15
}

function makeFavoritesSlideable() {
  if (screen.width < 1025) {
    return
  }

  if (!$('.js-slider').length) {
    return
  }

  setSliderTopOffset()
  $(window).resize(setSliderTopOffset)

  adjustSliderWidth()
  $(window).resize(adjustSliderWidth)

  makeFavoritesSlide()
  $(window).scroll(makeFavoritesSlide)
  $(window).resize(makeFavoritesSlide)
}

function makeFavoritesSlide() {
  if (sliderTopOffset > 0 && scrollY > sliderTopOffset) {
    if (!isSliderSliding) {
      $('.js-slider').addClass('sliding')
      isSliderSliding = true
    }
  }
  else {
    if (isSliderSliding) {
      $('.js-slider').removeClass('sliding')
      isSliderSliding = false
    }
  }
}

function adjustSliderWidth() {
  // Parce que la taille ne dépend plus du parent en position fixed
  $('.js-slider').css('width', $('.menu.js-favorites-forums').width())
}

function goToForm() {
  if (!$('#newmessage')) {
    return
  }
  $('.js-form-post .form__textarea').focus()
  scrollTo(0, $('.js-form-post').offset().top + 1)
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
  $('.js-form-post').submit(postMessage)
  $('.js-form-post .form__textarea').on('input', readyFormToPost)
  isFormReadyToPost = false

  $('.js-favorite-toggle, .js-quote').click(alertPlaceholder)
  $('.js-go-to-form').click(goToForm)

  syncFavorites()
  makeFavoritesSlideable()

  $('script[type=queued]').each(function() {
    eval($(this).html())
  })
})

addMessagesEvent('.spoil', 'click', toggleSpoil)

document.body.addEventListener('touchstart', setAsHavingTouch)
