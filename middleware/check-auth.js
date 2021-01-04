const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.userData = {
      email: decodedToken.email,
      userId: decodedToken.userId,
      name: decodedToken.name,
      role: decodedToken.role,
      site: decodedToken.site,
    };
    next();
  } catch {
    res.status(401).json({ message: "auth failed" });
  }
};
