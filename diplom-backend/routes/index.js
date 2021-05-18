var usersRouter = require('./api/users');
var logRouter = require('./api/log');
var apiIndexRouter = require('./api/index');
var express = require('express');
var router = express.Router();


module.exports = async (app, db) => {

  app.use('/',  router.get('/', function (req, res, next) {
    console.log('%s %s %s', req.method, req.url, req.path)
    next()
  }));
  app.use('/api', router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
  }));
  app.use('/api/users', await usersRouter(app, db));
  app.use('/api/logs', await logRouter(app, db));
}

