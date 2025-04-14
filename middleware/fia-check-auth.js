const { UserRefreshClient } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const User = require('../models/fia_user.js')

module.exports = async (req, res, next) => {
  try {
    console.log( ' token ')

    if (!req.headers.authorization) {
      return res.status(401).send('Unauthorized request - fia');
    }
    let token = req.headers.authorization.split(' ')[1];
    if (token === 'null' || token === '' || token === null || token === 'undefined') {
      return res.status(401).send('Unauthorized request');
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findOne({userId:decodedToken.userId})
    console.log(user, 'user', decodedToken, 'decodedToken')

    if (decodedToken) {
      req.userData = {
        email: decodedToken.email,
        userId: user._id,
        name: user.name,
        role: user.role,
        site: user.site,
      };
    }
   
    next();
  } catch (err) {
    console.log(err)
    res.status(401).json({ message: "auth failed - checkauth" + err });
  }
};
