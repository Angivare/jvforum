var isFormReadyToPost = false
  , hasTouch = false

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
    pathJvc: pathJvc,
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

      $('.messages-list').append('<p>' + data.sent.message + '</p>') // Dummy

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
})

$(document.body).on('touchstart', setAsHavingTouch)
