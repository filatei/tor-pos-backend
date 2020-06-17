const User = require("../models/user");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.userLogin = (req, res, next) => {
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
            {expiresIn:'100h'}
        );
        res.status(200).json({
            token: token,
            expiresIn: 360000,
            userId: fetchedUser._id
        });
    })
    .catch(err => {
      return res.status(500).json({
        message: "invalid auth credentials! " + err
      });
      
    });
}

exports.createUser = (req, res, next) => {
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
}

exports.updateUser = (req, res, next) => {
    let userObj = req.body;
    userObj._id = req.params.id;
    // userData  was added to checkAuth middleware and passed along
    userObj.updater = req.userData.userId; 
  
    const user = new User(userObj);
    
      User.updateOne({ _id: req.params.id }, user)
      .then(result => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch(error => {
        res.status(500).json({
          message: "Couldn't udpate user! " + error
        });
      });
  }

  exports.getUser = (req, res, next) => {
    //verify the JWT token generated for the user
    // console.log(req.userData)
    res.json({
        email: req.userData.email,
        userid: req.userData.userId,
        name: req.userData.name
    });
        
   
  }