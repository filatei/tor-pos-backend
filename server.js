const app = require("./app");
const fs = require('fs');
const os = require("os");
const hostname = os.hostname();
const debug = require("debug")("node-angular");
const ShopSetting = require('./models/shopsetting')
const Expense = require('./models/expense')
const User = require('./models/user')

require('longjohn');

const http = require("http");

const normalizePort = val => {
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

const onError = error => {
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

const port = normalizePort(process.env.PORT || "3000");
app.set("port", port);

const server = http.createServer(app);
socketOptions = {pingTimeout: 120000, pingInterval:5000}

var io = require('socket.io')(server, socketOptions);


io.on('connection', (socket) => {
   console.log('socket connected');
  socket.on('disconnect', (reason) => {
    console.log('socket disconnected', reason);
    
  });

  socket.on('error', (error) => {
    console.log('socket error', error);

  });

  socket.on('disconnecting', (reason) => {
    // let rooms = Object.keys(socket.rooms);
    console.log('socket disconnecting...', reason);
    // ...
  });
 
  // socket.on('err', (error) => { console.log('socket error ' +  error) });
  let settings;
  let user;
   socket.on('getSettings',  async (from, msg)  =>  {
    console.log('data', from, ' saying ', msg);
      if (from ) {
        user = await User.find({email: from.message})
        console.log(user)
        // settings = await ShopSetting.find({ creator: user._id })
        settings = await ShopSetting.find({ creator: user[0]._id })
        io.emit('getSettings2',  settings);
      }
    });
  // receive newnote and emit to event bearing author name
  socket.on('newNote', function (from, msg) {
    console.log('MSG', from, ' saying ', msg);
    io.emit('newNote2', from);
  });

  // events getExpenses and getExpensesAll
  socket.on('getExpenses',  async (from, msg)  =>  {
    console.log('data', from, ' saying ', msg);
      if (from ) {
        const expenses = await Expense.find();
        console.log(expenses[0])
        io.emit('getExpensesAll',  expenses);
      }
    });

    // get one expense given id
    socket.on('getExpense',  async (from, msg)  =>  {
      console.log('expeneOne data', from, ' saying ', msg);
        if (from ) {
          const expense = await Expense.findById(from.message);
          console.log(expense, 'one')
          io.emit('getExpenseOne',  expense);
        }
      });
});



server.on("error", onError);
server.on("listening", onListening);
server.listen(port, () => { console.log( `listening on port ${port}` ) });

