var TIMEOUT_POST_MESSAGE = 2000

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
  }

  $.post({
    url: '/ajax/postMessage',
    data: data,
    timeout: TIMEOUT_POST_MESSAGE,
  })
    .done(function(data, textStatus, jqXHR) {
      $('.form__textarea').val('')
      alert(data.message)
    })
    .fail(function(jqXHR, textStatus, errorThrown) {

    })
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

instantClick.on('change', function(isInitialLoad) {
  $('.js-form-post').submit(postMessage)
})
