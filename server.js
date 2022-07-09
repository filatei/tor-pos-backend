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
const cron =  require('node-cron');

const http = require("http");

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

const server = http.createServer(app);
// socketOptions = {pingTimeout: 120000, pingInterval:5000}

// var io = require('socket.io')(server, socketOptions);
const socketIO = require("socket.io");
const io = socketIO.listen(server);

// Use Sockets to setup the connection
io.sockets.on("connection", async (socket) => {
  // const expenses = await Expense.find().sort({ createdAt:-1 }).populate('vendor').populate('creator');
  // console.log('sending expenses via initial event')
  // io.sockets.emit('initial',  expenses);
  let socketId = socket.id;

  console.log("Socket connected ", socketId);
  socket.on("disconnect", (reason) => {
    console.log("socket disconnected", reason);
  });

  socket.on("error", (error) => {
    console.log("socket error", error);
  });

  socket.on("disconnecting", (reason) => {
    console.log("socket disconnecting...", reason);
  });

  socket.on("getStock", async (from, msg) => {
    let inventory;

    console.log(directors, directors.includes(from.email));
    console.log("data", from, " saying ", msg);

    // if ( directors.includes(from.email)) {
    //     inventory = await Inventory.find().sort({ createdAt:-1 }).populate('name')
    //     .populate('sender').populate('receiver');
    // } else {
    //     if (from && from.store && from.store !== undefined) {
    //       inventory = await Inventory.find( {store: from.store} ).sort({ createdAt:-1 }).populate('name')
    //       .populate('sender').populate('receiver');
    //     }

    // }
    console.log("socket id , store", socketId, from.store);
    inventory = await Inventory.find({ store: from.store })
      .sort({ createdAt: -1 })
      .populate("name")
      .populate("sender")
      .populate("receiver");
    if (inventory && inventory.length) {
      io.to(socketId).emit("getMyInventory", inventory);
    }
  });

  // events getExpenses and getExpensesAll
  let expenses;
  socket.on("getExpenses", async (from, msg) => {
    console.log("data", from, " saying ", msg);
    if (from) {
      user = await User.find({ email: from.email });
      console.log("socket id", socketId);
      // if ( directors.includes(from.email)) {
      //    expenses = await Expense.find().sort({ createdAt:-1 }).populate('vendor').populate('creator');

      // } else {
      //  expenses = await Expense.find({creator: user[0]._id}).sort({ createdAt:-1 }).populate('vendor').populate('creator');

      // }
      // const expenses = await Expense.find().sort({ createdAt:-1 }).populate('vendor').populate('creator');
      const expenses = await Expense.find({ creator: user[0]._id })
        .sort({ createdAt: -1 })
        .populate("vendor")
        .populate("creator");
      // console.log(expenses[0])
      io.to(socketId).emit("getMyExpenses", expenses);
    }
  });

  // receive newnote and emit to event bearing author name
  socket.on("newNote", function (from, msg) {
    console.log(
      `Note ${from.note} made on expense id # ${from.expenseId}`,
      " saying ",
      msg
    );
    // we may send email to author of expense from here.
    // io.to(socketId).emit('newNote2', from);
  });
});

server.on("error", onError);
server.on("listening", onListening);
server.listen(port, () => {
  console.log(`listening on port ${port}`);

});

//  run the scheduled task at 5:10pm every day Lagos time
const task = cron.schedule("10 50 * * *", () => {
  require('./generate-order-reports.js').main()
}, {
  scheduled: true,
  timezone: "Africa/Lagos"
})
