let config = {
  timeouts: {
    server: {
      notAuthentified: 2500,
    },
    client: {
      refresh: 9000,
      postMessage: 9000,
    },
    cache: {
      topicDisplay: 60 * 60 * 24 * 7,
      forumDisplay: 5,
      refresh: 5,
    },
  },
  refreshIntervals: {
    recent: 2000,
    old: 60000,
    check: 12000,
  },
  cookies: 'coniunctio=; dlrowolleh=',
  databaseConnection: {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'jvforum',
  },
}

module.exports = config
