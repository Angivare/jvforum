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

function setAsHavingTouch() {
  qs('html').classList.add('has-touch')
  hasTouch = true
  document.body.removeEventListener('touchstart', setAsHavingTouch)
}

function showErrors(errors) {
  $('.form__errors p').html(errors)
  $('.form__errors').show()
}

function alertPlaceholder() {
  alert('Cette fonction reviendra plus tard')
}

function addMessagesEvent(element, type, listener) {
  messagesEvents.push({
    element: element,
    type: type,
    listener: listener,
  })
  instantClick.on('change', function() {
    $('.message ' + element)[type](listener)
  })
}

function toggleSpoil(event) {
  event.stopPropagation()
  let target = $(event.target)
  if (target.is('a, .sticker, .noelshack-link__thumb')) {
    return
  }
  $(this).toggleClass('spoil--revealed')
}

function postMessage(event) {
  event.preventDefault()

  let message = $('.form__textarea').val()

  if (message.length == 0) {
    $('.form__textarea').focus()
    return
  }

  $('.button-mobile-post__visible').addClass('button-mobile-post__visible--sending')
  $('.button-mobile-post').blur()

  let data = {
    message: message,
    forumId: forumId,
    topicMode: topicMode,
    topicIdLegacyOrModern: topicIdLegacyOrModern,
    topicSlug: topicSlug,
    _csrf: _csrf,
  }

  instantClick.xhr($.post({
    url: '/ajax/postMessage',
    data: data,
    timeout: timeouts.postMessage,
  })
  .always(function() {
    $('.button-mobile-post__visible').removeClass('button-mobile-post__visible--sending')
  })
  .done(function(data, textStatus, jqXHR) {
    if (data.error) {
      showErrors(data.error)
      return
    }

    $('.form__errors').hide()
    $('.form__textarea').val('')

    isFormReadyToPost = false
    $('.button-mobile-post__visible').removeClass('button-mobile-post__visible--ready-to-post')

    if (!hasTouch) {
      $('.form__textarea').focus()
    }
  })
  .fail(function(jqXHR, textStatus, errorThrown) {
    showErrors('Erreur Ajax (' + textStatus + ': ' + errorThrown + ')')
  }))
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
      return
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
  instantClick.xhr($.post({
    url: '/ajax/syncFavorites',
    data: {
      _csrf: _csrf,
    },
    timeout: timeouts.syncFavorites,
  }))
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
