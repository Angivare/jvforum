#!/usr/bin/env node
let express = require('express')
  , path = require('path')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , compression = require('compression')
  , http = require('http')
  , consolidate = require('consolidate')
  , csrf = require('csurf')
  , stickers = require('./utils/stickers') // Loaded before the CPU intensive stuff to be ready as soon as the app is available
  , routes = require('./routes')
  , routesStaticFiles = require('./routes/staticFiles')
  , routesHomeLogin = require('./routes/home-login')
  , routesLogout = require('./routes/logout')
  , routesForum = require('./routes/forum')
  , routesTopic = require('./routes/topic')
  , routesStickers = require('./routes/stickers')
  , routesForumSearch = require('./routes/forum_search')
  , routesUnsupported = require('./routes/unsupported')
  , routesAjax = require('./routes/ajax')
  , config = require('./config')

let app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('html', consolidate.dot)
app.set('view engine', 'html')

app.set('trust proxy', true)

if (app.get('env') == 'development') {
  let morgan = require('morgan')
  app.use(morgan('dev'))
}

app.use(compression())
app.use(bodyParser.json())
app.use(cookieParser(config.cookiesSecret))
app.use(csrf({cookie: true}))

app.use(routes)
app.use(routesStaticFiles)
app.use(routesHomeLogin)
app.use(routesLogout)
app.use(routesForum)
app.use(routesTopic)
app.use(routesStickers)
app.use(routesForumSearch)
app.use(routesUnsupported)
app.use('/ajax', routesAjax)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

let server = http.createServer(app)
server.listen(process.env.PORT || 3000)

server.on('error', (error) => {
  throw error
})

module.exports = app
