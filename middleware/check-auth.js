const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {

    if (!req.headers.authorization) {
      return res.status(401).send('Unauthorized request');
    }
    let token = req.headers.authorization.split(' ')[1];
    if (token === 'null' || token === '' || token === null || token === 'undefined') {
      return res.status(401).send('Unauthorized request');
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    if (decodedToken) {
      req.userData = {
        email: decodedToken.email,
        userId: decodedToken.userId,
        name: decodedToken.name,
        role: decodedToken.role,
        site: decodedToken.site,
      };
    }

   
    next();
  } catch (err) {
    console.log(err)
    res.status(401).json({ message: "auth failed - checkauth" + err });
  }
};
