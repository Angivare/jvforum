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
      date = day + ' ' + months[parseInt(month) - 1] + ' ' + year
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
  // Example: "07 juin 2016 à 19:26:12"
  let now = new Date()
    , [day, month, year, , time] = date.split(' ')
    , [hours, minutes, seconds] = time.split(':')
  month = monthsFull.indexOf(month)
  day = parseInt(day)
  let then = new Date(year, month, day, hours, minutes, seconds)
    , timestamp = then / 1000
    , diff = Math.floor((now - then) / 1000)

  if (diff < 60) {
    date = diff + ' s'
  }
  else if (diff < 60 * 60) {
    date = Math.floor(diff / 60) + ' m ' + (diff % 60) + ' s'
  }
  else {
    date = day + ' ' + months[month]
    if (year == now.getFullYear()) {
      let yesterday = new Date(now - (1000 * 60 * 60 * 24))
        , dayBeforeYesterday = new Date(now - (1000 * 60 * 60 * 24 * 2))
      if (now.getMonth() == month && now.getDate() == day) {
        date = ''
      }
      else if (yesterday.getMonth() == month && yesterday.getDate() == day) {
        date = 'hier'
      }
      else if (dayBeforeYesterday.getMonth() == month && dayBeforeYesterday.getDate() == day) {
        date = 'avant-hier'
      }
    }
    else {
      date += ' ' + year
    }

    if (date) {
      date += ', '
    }
    date += formatHoursAndMinutes(then)
  }

  return {
    diff,
    text: date,
    timestamp,
  }
}

function quoteFormat(timestamp) {
  let date
    , now = new Date()
    , then = new Date()
  then.setTime(timestamp * 1000)
  let day = then.getDate()
    , month = then.getMonth()
    , year = then.getFullYear()

  let diff = Math.floor((now - then) / 1000)

  if (diff < 60 * 20) {
    date = ''
  }
  else {
    date = `le ${day} ${months[month]}`
    if (year == now.getFullYear()) {
      let yesterday = new Date(now - (1000 * 60 * 60 * 24))
        , dayBeforeYesterday = new Date(now - (1000 * 60 * 60 * 24 * 2))
      if (now.getMonth() == month && now.getDate() == day) {
        date = ''
      }
      else if (yesterday.getMonth() == month && yesterday.getDate() == day) {
        date = 'hier'
      }
      else if (dayBeforeYesterday.getMonth() == month && dayBeforeYesterday.getDate() == day) {
        date = 'avant-hier'
      }
    }
    else {
      date += ' ' + year
    }

    date += ' à '
    date += formatHoursAndMinutes(then)
  }

  return date
}

function editFormat(editDateRaw, postDateRaw) {
  let now = new Date()
    , [day, month, year, , time] = editDateRaw.split(' ')
    , [hours, minutes, seconds] = time.split(':')
  month = monthsFull.indexOf(month)
  day = parseInt(day)
  let editDate = new Date(year, month, day, hours, minutes, seconds)
    , postDate
  ;{
    let [day, month, year, , time] = postDateRaw.split(' ')
      , [hours, minutes, seconds] = time.split(':')
    month = monthsFull.indexOf(month)
    day = parseInt(day)
    postDate = new Date(year, month, day, hours, minutes, seconds)
  }
  let diff = Math.floor((editDate - postDate) / 1000)

  if (diff < 60) {
    text = `après ${diff} s`
  }
  else if (diff < 60 * 60) {
    text = `après ${Math.floor(diff / 60)} m ${diff % 60} s`
  }
  else {
    text = ` le ${day} ${months[month]}`
    if (year == now.getFullYear()) {
      let yesterday = new Date(now - (1000 * 60 * 60 * 24))
        , dayBeforeYesterday = new Date(now - (1000 * 60 * 60 * 24 * 2))
      if (now.getMonth() == month && now.getDate() == day) {
        text = ''
      }
      else if (yesterday.getMonth() == month && yesterday.getDate() == day) {
        text = 'hier'
      }
      else if (dayBeforeYesterday.getMonth() == month && dayBeforeYesterday.getDate() == day) {
        text = 'avant-hier'
      }
    }
    else {
      text += ' ' + year
    }

    if (text) {
      text += ' à '
    }
    text += formatHoursAndMinutes(editDate)
  }

  return text
}

function convertProfileDateToTimestamp(dateString) {
  // Example: "12 mars 1998"
  let [day, month, year] = dateString.split(' ')
  month = monthsFull.indexOf(month)
  day = parseInt(day)
  let then = new Date(year, month, day, 0, 0, 0)
    , timestamp = then / 1000

  return timestamp
}

function convertProfileTimestampToDate(timestamp) {
  let date = new Date(timestamp * 1000)
    , relativeDays = Math.floor((+new Date - date) / (1000 * 60 * 60 * 24))
    , absoluteYear = date.getFullYear()
    , absoluteDate = pad(date.getDate()) + ' ' + monthsFull[date.getMonth()]
    , absoluteHour = formatHoursAndMinutes(date)

  if (timestamp < 1236853380 || (absoluteHour == '00:00' && date.getSeconds() == 0)) {
    // Timestamps are only accurate to the day before 2009/03/12 at 11h23m
    absoluteHour = false
  }

  return {
    relativeDays,
    absoluteYear,
    absoluteDate,
    absoluteHour,
  }
}

module.exports = {
  convertTopicList,
  convertMessage,
  quoteFormat,
  editFormat,
  convertProfileDateToTimestamp,
  convertProfileTimestampToDate,
}
