const app = require("./app");
const debug = require("debug")("node-angular");
// const http = require("http");

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

// const server = http.createServer(app);
// server.on("error", onError);
// server.on("listening", onListening);
// server.listen(port);



var http = require('http').Server(app);
const server = http;
var io = require('socket.io')(http);

io.on('connection', function (socket){
   console.log('socket connected');
   socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('error', (error) => { console.log (error) });

  // io.on('connection', (socket) => {
  //   socket.broadcast.emit('hi');
  // });

   // This will emit the event to all connected sockets
   const receipt = {
      _id: '5f4e985540429627fcd63bbd',
      name: 'DIESEL',
      qty: 1000,
      unit: 'kg',
      price: 160,
      description: 'DIESEL',
      category: 'General'
    }

  // io.emit('event', receipt);
  
  let recept;
  socket.on('KPANSIA', function (from, msg) {
    console.log('MSG', from, ' saying ', msg);
    io.emit('KPANSIA', from);
  });

  socket.on('OKUTUKUTU', function (from, msg) {
    console.log('MSG', from, ' saying ', msg);
    io.emit('OKUTUKUTU', from);
  });

  socket.on('SWALI', function (from, msg) {
    console.log('MSG', from, ' saying ', msg);
    io.emit('SWALI', from);
  });

  socket.on('YENEGWE', function (from, msg) {
    console.log('MSG', from, ' saying ', msg);
    io.emit('YENEGWE', from);
  });

  socket.on('OBUNNA', function (from, msg) {
    console.log('MSG', from, ' saying ', msg);
    io.emit('OBUNNA', from);
  });

  socket.on('ABUJA', function (from, msg) {
    console.log('MSG', from, ' saying ', msg);
    io.emit('ABUJA', from);
  });

  socket.on('BOMADI', function (from, msg) {
    console.log('MSG', from, ' saying ', msg);
    io.emit('BOMADI', from);
  });



  // io.emit('event', recept);

  // socket.on('event', (msg) => {
  //   io.emit('event', msg);
  // });

});

http.on("error", onError);
http.on("listening", onListening);

http.listen(port, function () {
  console.log('listening on *:', port);
});

