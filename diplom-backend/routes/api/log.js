
var express = require('express');
var jwt = require('jsonwebtoken');
/* GET users listing. */
const SECRET_PASSWORD = 'Weq@#123r#$#rwetdfg@@#@#211fdytu566413dfba4t';

module.exports = async (app, db) => {
    var router = express.Router();
    router.get('/:start/:end', async function(req, res, next) {
        const {start = 0, end = 10} = req.params;
        if(Number.isNaN(start) && Number.isNaN(end)){
            res.status(400).send({'error':'Неверный диапазон'});
            return
        }
        const auth = req.header('Authorization');
        const match = auth.match(/^Bearer ([A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*)$/)[1];
        if(!match){
            res.status(401).send({'error':'Требуется авторизация'});
            return;
        }try {
            console.log(match);
            const ver = await jwt.verify(match, SECRET_PASSWORD);
            if(!ver){
                res.status(401).send({'error':'Требуется авторизация'});
            }
            const token = await jwt.decode(match);
            const findData = token.admin === true? {} : {login: token.username};
            const list = await  db.collection('log-auth').find(findData).skip(parseInt(start)).limit(end-start).toArray();
            res.send(list);
        }catch(e){
            res.status(401).send({'error':'Токен не валидный', e: e.message});
        }
    });
    return router;
};
