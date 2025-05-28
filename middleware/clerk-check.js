const { verifyToken } = require('@clerk/backend');
const User = require('../models/user');
require('dotenv').config();

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
//   console.log(process.env.CLERK_SECRET_KEY,'process.env.CLERK_SECRET_KEY')

  if (!process.env.CLERK_SECRET_KEY || !token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { sessionId, userId, claims } = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    req.auth = { sessionId, userId, claims };
    if (claims && claims.email && claims.email !== 'null' && claims.email !== 'undefined') {
      const dbUser = await User.findOne({ email: claims?.email });

      req.userData = {
        email: claims?.email,
        userId: dbUser?._id,
        name: claims?.name,
        role: dbUser.role,
        site: dbUser.site,
      };
    } else {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  } catch (err) {
    console.error('Clerk token verification failed:', err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
