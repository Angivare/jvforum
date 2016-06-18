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
  cookies: 'coniunctio=; dlrowolleh=',
  databaseConnection: {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'jvforum',
  },
}

module.exports = config
