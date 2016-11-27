let config = {
  cookiesSecret: 'secret',
  databaseConnection: {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'jvforum',
  },
  maxSimultaneousRequests: 30,
  googleAnalyticsId: '',

  /* ------------------------ */

  timeouts: {
    server: {
      notAuthentified: 2500,
      postMessageForm: 2500,
      postMessage: 2500,
      syncFavorites: 2500,
    },
    client: {
      refresh: 9000,
      postMessage: 9000,
      syncFavorites: 9000,
    },
    cache: {
      topicDisplay: 60 * 60 * 24 * 7,
      forumDisplay: 5,
      refresh: 5,
      favorites: 60 * 30,
    },
  },
  refreshIntervals: {
    recent: 2000,
    old: 60000,
    check: 12000,
  },
}

module.exports = config
