let months = ['janv', 'fév', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc']
  , monthsFull = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function pad(number) {
  if (number < 10) {
    return '0' + number
  }
  return number
}

function formatHoursAndMinutes(dateObject) {
  return pad(dateObject.getHours()) + ':' + pad(dateObject.getMinutes())
}

function convertTopicList(date) {
  let now = new Date()
  if (date.includes('/')) {
    let [day, month, year] = date.split('/')
      , then = new Date(year, month - 1, day)
    day = parseInt(day)
    if (year == now.getFullYear()) {
      let yesterday = new Date(now - (1000 * 60 * 60 * 24))
        , dayBeforeYesterday = new Date(now - (1000 * 60 * 60 * 24 * 2))
      if (yesterday.getMonth() == month - 1 && yesterday.getDate() == day) {
        date = 'hier'
      }
      else if (dayBeforeYesterday.getMonth() == month - 1 && dayBeforeYesterday.getDate() == day) {
        date = 'avant-hier'
      }
      else {
        date = day + ' ' + months[parseInt(month) - 1]
      }
    }
    else {
      date = day + ' ' + months[parseInt(month) - 1] + ' ’' + pad(year % 100)
    }
  }
  else {
    let [hours, minutes, seconds] = date.split(':')
      , then = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, seconds)
      , diff = Math.floor((now - then) / 1000)

    if (diff < 60) {
      date = diff + ' s'
    }
    else if (diff < 60 * 60) {
      date = Math.floor(diff / 60) + ' m ' + (diff % 60) + ' s'
    }
    else {
      date = formatHoursAndMinutes(then)
    }
  }
  return date
}

function convertMessage(date) {
  // 07 juin 2016 à 19:26:12
  let now = new Date()
    , [day, month, year, , time] = date.split(' ')
    , [hours, minutes, seconds] = time.split(':')
  month = monthsFull.indexOf(month) + 1
  day = parseInt(day)
  let then = new Date(year, month - 1, day, hours, minutes, seconds)
    , diff = Math.floor((now - then) / 1000)

  if (diff < 60) {
    date = diff + ' s'
  }
  else if (diff < 60 * 60) {
    date = Math.floor(diff / 60) + ' m ' + (diff % 60) + ' s'
  }
  else {
    date = day + ' ' + months[month - 1]
    if (year == now.getFullYear()) {
      let yesterday = new Date(now - (1000 * 60 * 60 * 24))
        , dayBeforeYesterday = new Date(now - (1000 * 60 * 60 * 24 * 2))
      if (now.getMonth() == month - 1 && now.getDate() == day) {
        date = ''
      }
      else if (yesterday.getMonth() == month - 1 && yesterday.getDate() == day) {
        date = 'hier'
      }
      else if (dayBeforeYesterday.getMonth() == month - 1 && dayBeforeYesterday.getDate() == day) {
        date = 'avant-hier'
      }
    }
    else {
      date += ' ’' + pad(year % 100)
    }

    if (date) {
      date += ', '
    }
    date += formatHoursAndMinutes(then)
  }

  return date
}

module.exports = {
  convertTopicList,
  convertMessage,
}
