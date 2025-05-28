
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
    // console.log(token, 'token from check-auth')

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

// middleware/check-auth.js
// const jwt = require("jsonwebtoken");
// const WebSocket = require("ws");
// const { verifyClerkToken } = require("../utils/clerk");
// // const { clerkClient } = require("@clerk/express");
// // const User = require("../models/user");

// const wss = new WebSocket.Server({ port: 8080 });
// const connectedUsers = new Set();

// module.exports = async (req, res, next) => {
//   try {
//     const auth = req.headers.authorization;
//     if (!auth) {
//       return res.status(401).send("Unauthorized request");
//     }
//     const token = auth.split(" ")[1];
//     if (!token || token === "null" || token === "undefined") {
//       return res.status(401).send("Unauthorized request");
//     }

//     let userData;

//     // 1) Try your own app's JWT
   

//     // Attach normalized userData
//     req.userData = userData;

//     // Track WebSocket presence
//     connectedUsers.add(userData.userId);
//     wss.clients.forEach((client) => {
//       if (client.readyState === WebSocket.OPEN) {
//         client.send(JSON.stringify([...connectedUsers]));
//       }
//     });

//     next();
//   } catch (err) {
//     console.error("auth failed - check-auth:", err);
//     res.status(401).json({ message: "auth failed - check-auth" });
//   }
// };

// // WebSocket cleanup
// wss.on("connection", (ws) => {
//   ws.on("close", () => {
//     // Optionally track which user closed this socket, if you attached ws.userId
//     // connectedUsers.delete(ws.userId);
//     wss.clients.forEach((client) => {
//       if (client.readyState === WebSocket.OPEN) {
//         client.send(JSON.stringify([...connectedUsers]));
//       }
//     });
//   });
// });

