let config = {
  timeouts: {
    server: {
      notAuthentified: 2500,
    },
    client: {
      refresh: 9000,
      postMessage: 9000,
    },
  },
  refreshIntervals: {
    recent: 5000,
    old: 5 * 60 * 1000,
    check: 15000,
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
