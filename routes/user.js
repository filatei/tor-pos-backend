const express = require("express");
const User = require("../models/user");
const bcrypt = require('bcrypt');
const router = express.Router();
const jwt = require('jsonwebtoken');

router.post('/signup', (req, res, next) => {
    
    bcrypt.hash(req.body.password,10).then( hash => {
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            password: hash
        })
        user.save()
        .then((result) => {
           // console.log(result)
           res.status(201).json({
            message: "User created!",
            result: result
          });
        })
        .catch(err => {
            res.status(500).json({
              message: "Invalid authentication credentials!"
            });
        });

    })
    

})


router.post('/login', (req, res, next) => {
    let fetchedUser;
    User.findOne({email: req.body.email})
    .then ((user) => {
        if (!user) {
            return res.status(401).json({
              message: "Auth failed"
            });
          }
          fetchedUser = user;
      return bcrypt.compare(req.body.password, user.password);
    })
    .then(result => {
        if (!result) {
          return res.status(401).json({
            message: "Auth failed"
          });
        }
        const token = jwt.sign(
            { email: fetchedUser.email, userId: fetchedUser._id },
            process.env.ACCESS_TOKEN_SECRET,
            {expiresIn:'10h'}
        );
        res.status(200).json({
            token: token,
            expiresIn: 36000,
            userId: fetchedUser._id
        });
    })
    .catch(err => {
        return res.status(401).json({
          message: "Invalid authentication credentials!"
        });
    });
})

// router.get('', authenticateToken, (req, res) => {
//     console.log(req.user)
//    // res.json(posts.filter(post => post.username === req.user.name))
// })


// // middlewares
// function authenticateToken(req, res, next) {
//     const authHeader = req.headers['authorization']
//     const token = authHeader && authHeader.split(' ')[1]
//     if (token == null) return res.sendStatus(401)

//    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
//        if (err) return res.sendStatus(403)
//        req.user = user({
//            email: req.body.email,
//            password: req.body.password
//        })
//        next()
//    })
// }

module.exports = router;
