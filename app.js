let express = require('express')
  , path = require('path')
  , favicon = require('serve-favicon')
  , logger = require('morgan')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , compression = require('compression')
  , http = require('http')
  , consolidate = require('consolidate')
  , routesStaticFiles = require('./routes/staticFiles')
  , routesIntroduction = require('./routes/introduction')
  , routesForum = require('./routes/forum')
  , routesTopic = require('./routes/topic')
  , routesAjax = require('./routes/ajax')
  , config = require('./config')
  , app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('html', consolidate.dot)
app.set('view engine', 'html')

app.use(favicon(path.join(__dirname, 'assets', 'images/favicon.png')))
app.use(compression())
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser(config.cookiesSecret))

app.use(routesStaticFiles)
app.use(routesIntroduction)
app.use(routesForum)
app.use(routesTopic)
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

module.exports = app
