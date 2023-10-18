// 'use strict'
const app = require("./app");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
const debug = require("debug")("node-angular");
const ShopSetting = require("./models/shopsetting");
const Expense = require("./models/expense");
const Inventory = require("./models/inventory");
const User = require("./models/user");
let directors = process.env.DIRECTORS;
const cron = require('node-cron');

const WebSocket = require('ws');
const mongoEmitter = require('./mongoconnection');  // Import the emitter

const http = require("http");
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
});

mongoEmitter.on('mongoConnected', (db) => {
  const orderCollection = db.collection('fidoorders');
  const changeStream = orderCollection.watch();

  changeStream.on('change', async (change) => {

    const operationType = change.operationType;

    if (operationType === 'delete') {
      // Handle delete operation
      console.log('A document was deleted', change);
      // Your code for handling deletes
    }
    // const fullDocument = change.fullDocument;
    console.log(' inside changestream')
    // if (!fullDocument) return;

    // const transDate = new Date(fullDocument.trans_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // if (transDate >= today) {
    // Run aggregation query for today's sales per site
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const aggregationResults = await orderCollection.aggregate([
      {
        $match: {
          trans_date: { $gte: today, $lt: tomorrow },
          // site: fullDocument.site  // Change this if you want aggregation for all sites
        }
      },
      {
        $unwind: '$products'
      },
      {
        $group: {
          _id: {
            site: '$site',
            productName: '$products.name'
          },
          totalQty: { $sum: '$products.qty' },
          totalAmount: { $sum: '$products.amount' }
        }
      },
      {
        $group: {
          _id: "$_id.site",
          products: {
            $push: {
              productName: "$_id.productName",
              totalQty: "$totalQty",
              totalAmount: "$totalAmount",
            },
          },
        }
      },
    ]).toArray();

    // Broadcast the summary data to all WebSocket clients
    console.log(aggregationResults, ' aggregationResults')
    wss.clients.forEach(client => {
      client.send(JSON.stringify(aggregationResults));
    });
    // }
  });
});

const normalizePort = (val) => {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
};

const onError = (error) => {
  if (error.syscall !== "listen") {
    throw error;
  }
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + port;
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
};

const onListening = () => {
  const addr = server.address();
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + port;
  debug("Listening on " + bind);
};

const port = normalizePort("3500");
app.set("port", port);

server.on("error", onError);
server.on("listening", onListening);
server.listen(port, () => {
  console.log(`listening on port ${port}`);

});

