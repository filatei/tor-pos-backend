const User = require("../models/user");
const express = require("express");
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs')
var multer  = require('multer')
const DIR = './uploads/userimages/';
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DIR);
  },
  filename: (req, file, cb) => {
    const fileName =  new Date().getTime() + '-' + file.originalname.toLowerCase().split(' ').join('-');
    console.log(fileName)
    cb(null, fileName)
  }
});


// Multer Mime Type Validation
var upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype == "image/gif" || file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error('Only .gif, .png, .jpg and .jpeg format allowed!'));
    }
  }
});
const checkAuth = require('../middleware/check-auth');

router.post("/login", (req, res, next) => {
    let fetchedUser;
    User.findOne({email: req.body.email})
    .then ((user) => {
        if (!user) {
            return res.status(401).json({
              message: "Authentication failed. invalid credentials"
            });
          }
          fetchedUser = user;
          console.log('fetcheduser ', fetchedUser)
      return bcrypt.compare(req.body.password, user.password);
    })
    .then(result => {
        if (!result) {
          return res.status(401).json({
            message: "Authentication failed."
          });
        }
        const token = jwt.sign(
            { email: fetchedUser.email, userId: fetchedUser._id, name: fetchedUser.name },
            process.env.ACCESS_TOKEN_SECRET,
            {expiresIn:'1000h'}
        );
        res.status(200).json({
            token: token,
            expiresIn: 360000,
            userId: fetchedUser._id,
            email: fetchedUser.email,
            name: fetchedUser.name
        });
    })
    .catch(err => {
      return res.status(500).json({
        message: "invalid auth credentials! " + err
      });
      
    });
});


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
              message: "Invalid authentication credentials! " + err
            });
        });
    })
})


router.put('/:id', checkAuth, upload.single('image'), (req, res, next) => {

    let userObj = req.body;
    userObj._id = req.params.id;
    // userData  was added to checkAuth middleware and passed along

    let path = ""
    let url= ""
    if ( req.file ) { 
        url = req.protocol + '://' + req.get('host')
        // url = 'https://api.torama.ng'
        path = url + '/uploads/userimages/' + req.file.filename; 
        // console.log(path)
    }

    userObj.updater = req.userData.userId;
    userObj.image = path;
    const user = new User(userObj);
    User.updateOne({ _id: req.params.id }, user)
    .then(result => {
        if (result.n > 0) {
            res.status(200).json({ message: "Update successful!" });
        } else {
            res.status(401).json({ message: "Not authorized!" });
        }
    })
    .catch( error => {
        res.status(500).json({
            message: "Couldn't update user! " + error
        });
    });
})

router.post('/getuser', checkAuth, (req, res, next) => {
    res.json({
        email: req.userData.email,
        userid: req.userData.userId,
        name: req.userData.name
    });
})

  router.get('/getusers', (req, res, next) => {
    //verify the JWT token generated for the user
    // console.log(req.userData)
    User.find({}).
    then( result => {
      // console.log (result, 'of users')
      result.map((r) =>  {
        return {name: r.name, email: r.email}
      })

      res.status(200).json({
        users: result
      });
    })
  });


module.exports = router;
 