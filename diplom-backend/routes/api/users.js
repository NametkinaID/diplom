var faceapi = require('face-api.js');
const twofactor = require("node-2fa");
const uuid =require("uuid")
var express = require('express');
var jwt = require('jsonwebtoken');
/* GET users listing. */
const SECRET_PASSWORD = 'Weq@#123r#$#rwetdfg@@#@#211fdytu566413dfba4t';

module.exports = async (app, db) => {
  await faceapi.nets.ssdMobilenetv1.loadFromDisk('./public/models');
  var router = express.Router();
  router.put('/:login/verify', async function(req, res, next) {
    const details = { 'username': req.params.login };
    const {token} = req.body;
    try {
      const item = await db.collection('users').findOne(details);
      const check = twofactor.verifyToken(item.secret, token);
      if(check && check.delta === 0) {
        db.collection('users').updateOne(details, {$set:{singPass: null}});
        res.send({'ok':true,token: jwt.sign({ username: item.username, admin: item.admin ?? false }, SECRET_PASSWORD, { expiresIn: 5 * 60 })});
      } else {
        res.status(400).send({'errmsg':'password non correct'});

      }
    }catch (e) {
      res.status(400).send({'errmsg':'An error has occurred',e: e.message});
    }
  });

  function log(login, photo,descriptor,
               password, singlePass){
    const data = {
      time: new Date(),
      login,
      photo,
      descriptor,
      password,
      singlePass,
    };
    db.collection('log-auth').insert(data);
  }
    router.post('/:login', function(req, res, next) {
    const details = { 'username': req.params.login };
    db.collection('users').findOne(details, (err, item) => {
      const {password, descriptor, photo} = req.body;
      if (err) {
        log(details.username, photo, []);
        res.status(400).send({'errmsg':'An error has occurred'});
      } else {
        if(!item){
          log(details.username, photo, []);
          res.status(400).send({'errmsg':'Авторизация не успешна'});
          return;
        }
        const faceMatcher = new faceapi.FaceMatcher(new Float32Array(item.descriptor));
        let ret = {first: false};
        const bestMatch = faceMatcher.findBestMatch(descriptor);
        if(bestMatch.distance > 0.65) {
          res.status(400).send({errorNo: 401, errmsg: 'Авторизация не успешна'});
          log(item.username, photo, descriptor, password, item.singPass);
          return ;
        }
        if(password === item.singPass && item.singPass !== null) {
          res.send({first: true, qr: item.qr, id:item.id, username:item.username});
          return;
        }
        else if(item.singPass === null){
          const check = twofactor.verifyToken(item.secret, password);
          if(check && check.delta === 0){
            res.send({...ret, id:item.id, username:item.username, token: jwt.sign({ username: item.username, admin: item.admin ?? false }, SECRET_PASSWORD)});
            return;
          }
        }
        log(item.username, photo, descriptor, password, item.singPass);
        res.status(400).send({errorNo: 401, errmsg: 'Авторизация не успешна'})
      }
    });
  });
  function randomInteger(min, max) {
    // получить случайное число от (min-0.5) до (max+0.5)
    let rand = min - 0.5 + Math.random() * (max - min + 1);
    return Math.round(rand);
  }
  /* create user. */
  router.post('/', function(req, res, next) {
    const chars = 'asdfghjklqwertyuiopzxcvbnm1234567890';

    const id=uuid.v4()
    const singPass = ' '.repeat(6).split('').map(() => chars[randomInteger(0, chars.length)]).join('');
    const newSecret = twofactor.generateSecret({ name: "Face Authenicator", account: req.body.username});
    const note = { username: req.body.username, descriptor: req.body.descriptor, singPass, id, secret: newSecret.secret, qr:newSecret.qr};
    db.collection('users').insert(note, (err, result) => {
      if (err) {
        res.send({ 'errmsg': 'An error has occurred' });
      } else {
        const {id, username, singPass} = result.ops[0];
        res.send({id, username, singPass});
      }
    })
  });
  return router;
};
