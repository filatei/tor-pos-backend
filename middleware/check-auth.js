
const jwt = require("jsonwebtoken");
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

const connectedUsers = new Set();

module.exports = (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      return res.status(401).send('Unauthorized request');
    }
    let token = req.headers.authorization.split(' ')[1];
    // console.log(token, 'token');
    if (token === 'null' || token === '' || token === null || token === 'undefined') {
      return res.status(401).send('Unauthorized request');
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    // console.log(decodedToken, 'decodedToken');

    if (decodedToken) {
      req.userData = {
        email: decodedToken.email,
        userId: decodedToken.userId,
        name: decodedToken.name,
        role: decodedToken.role,
        site: decodedToken.site,
      };

      // Add user to the connected users set
      connectedUsers.add(req.userData.userId);
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify([...connectedUsers]));
        }
      });
    }

    next();
  } catch (err) {
    console.log(err)
    res.status(401).json({ message: "auth failed - checkauth" + err });
  }
};

// WebSocket connection handler
wss.on('connection', (ws) => {
  ws.on('close', () => {
    // Remove user from the connected users set when the WebSocket connection closes
    connectedUsers.delete(ws.userId);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify([...connectedUsers]));
      }
    });
  });
});

