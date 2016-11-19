let express = require('express')
  , path = require('path')
  , logger = require('morgan')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , compression = require('compression')
  , http = require('http')
  , consolidate = require('consolidate')
  , csrf = require('csurf')
  , stickers = require('./utils/stickers') // Loaded before the CPU intensive stuff to be ready as soon as the app is available
  , routesStaticFiles = require('./routes/staticFiles')
  , routesHomeLogin = require('./routes/home-login')
  , routesForum = require('./routes/forum')
  , routesTopic = require('./routes/topic')
  , routesAjax = require('./routes/ajax')
  , config = require('./config')
  , app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('html', consolidate.dot)
app.set('view engine', 'html')

app.set('trust proxy', true)

app.use(compression())
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser(config.cookiesSecret))
app.use(csrf({cookie: true}))

app.use((req, res, next) => {
  req.cf_ip = req.ip
  if (config.useCloudFlare && 'cf-connecting-ip' in req.headers) {
    req.cf_ip = req.headers['cf-connecting-ip']
  }
  next()
})

app.use(routesStaticFiles)
app.use(routesHomeLogin)
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
