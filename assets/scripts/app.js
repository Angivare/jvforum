var REFRESH_INTERVAL = 5
  , REFRESH_INTERVAL_FOR_OLD_CONTENT = 5 * 60
  , REFRESH_CHECK_INTERVAL = 15

var isFormReadyToPost = false
  , hasTouch = false
  , refreshTimeout
  , lastRefreshTimestamp = 0

function setAsHavingTouch() {
  $('html').addClass('has-touch')
  hasTouch = true
  $(document.body).off('touchstart', setAsHavingTouch)
}

function showErrors(errors) {
  $('.form__errors p').html(errors)
  $('.form__errors').show()
}

function alertPlaceholder() {
  alert('Cette fonction reviendra plus tard')
}

function addMessagesEvent(element, type, listener) {
  instantClick.on('change', function() {
    $('.message ' + element)[type](listener)
  })
}

function toggleSpoil(event) {
  event.stopPropagation()
  var target = $(event.target)
  if (target.is('a, .sticker, .noelshack-link__thumb')) {
    return
  }
  $(this).toggleClass('spoil--revealed')
}

function postMessage(event) {
  event.preventDefault()

  var message = $('.form__textarea').val()

  if (message.length == 0) {
    $('.form__textarea').focus()
    return
  }

  $('.button-mobile-post__visible').addClass('button-mobile-post__visible--sending')
  $('.button-mobile-post').blur()

  var data = {
    message: message,
    forumId: forumId,
    topicMode: topicMode,
    topicIdLegacyOrModern: topicIdLegacyOrModern,
    slug: slug,
  }

  $.post({
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

function startRefresh() {
  var lastMessageAge = $('.message').last().data('age')
  if (lastMessageAge == undefined) {
    return
  }

  var isLastPage = $('.pagination-topic__page-link').last().hasClass('pagination-topic__page-link--active')
  if (isLastPage || lastMessageAge < 5 * 60) {
    instantClick.setTimeout(refresh, (REFRESH_INTERVAL - cacheAge) * 1000)
    instantClick.setInterval(restartRefreshIfNeeded, REFRESH_CHECK_INTERVAL)
  }
  else {
    instantClick.setTimeout(refresh, (REFRESH_INTERVAL_FOR_OLD_CONTENT - cacheAge) * 1000)
  }
}

function restartRefreshIfNeeded() {
  if (lastRefreshTimestamp < +new Date - REFRESH_CHECK_INTERVAL * 1000) {
    refresh()
  }
}

function refresh() {
  lastRefreshTimestamp = +new Date
}

instantClick.init()

if (googleAnalyticsId) {
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
  ga('create', googleAnalyticsID, 'auto');

  instantClick.on('change', function() {
    ga('set', 'dimension1', 'Member')
    ga('send', 'pageview', location.pathname + location.search)
  })
}

instantClick.on('change', function() {
  FastClick.attach(document.body)

  $('.js-form-post').submit(postMessage)
  $('.js-form-post .form__textarea').on('input', readyFormToPost)
  isFormReadyToPost = false

  $('.js-favorite-toggle, .js-quote').click(alertPlaceholder)

  startRefresh()
})

addMessagesEvent('.spoil', 'click', toggleSpoil)

$(document.body).on('touchstart', setAsHavingTouch)
