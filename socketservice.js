const fs = require('fs');
var path = require('path');
const os = require("os");
const hostname = os.hostname();
const homedir = os.homedir();
// const server = require('https').createServer({
//   key: fs.readFileSync('./ssl/localhost.key'),
//   cert: fs.readFileSync('./ssl/localhost.crt')
// });


// const options = {
//     transports: ['polling','websocket'],
//     secure: true
//  };
// const io = require('socket.io')(server, options);

// io.on('connection', socket => { 
//     console.log ('socket connected');

//     socket.on('disconnect', () => {
//         console.log('socket disconnected');
//       });
    
//     socket.on('KPANSIA', function (from, msg) {
//         console.log('MSG', from, ' saying ', msg);
//         io.emit('KPANSIA', from);
//     });
// });

// server.listen(3000);


class SocketService {
  constructor (app, port) {
    this.port = port;
    this.options = {
        transports: ['polling','websocket'],
        secure: true
    };
    process.env.NODE_ENV = 'development'
    console.log (process.env.NODE_ENV)

    switch (process.env.NODE_ENV) {

      case 'development':
        this.server = require('https').createServer({
            key: fs.readFileSync('./ssl/localhost.key'),
            cert: fs.readFileSync('./ssl/localhost.crt')
          },app);
          
        // this.server =
        //   https.createServer({
        //     key: fs.readFileSync(
        //       path.resolve(process.env.SSL_DEV_KEY || './ssl/localhost.key')
        //     ),
        //     cert: fs.readFileSync(
        //       path.resolve(process.env.SSL_DEV_CRT || './ssl/localhost.crt')
        //     )
        //   }, app);
          console.log('I am here')
        break;

      default:
        this.server = https.createServer({
          key: fs.readFileSync(
            process.env.SSL_PDT_KEY || `${homedir}/letsencrypt/privkey4.pem`
          ),
          cert: fs.readFileSync(
            process.env.SSL_PDT_CRT || `${homedir}/letsencrypt/cert4.pem`
          ),
          ca: fs.readFileSync(
            process.env.SSL_PDT_CA || `${homedir}/letsencrypt/fullchain4.pem`
          ),
          requestCert: true,
          rejectUnauthorized: false
        }, app);
    }
  }

  initServer () {
    this.io = require('socket.io')(this.server, this.options);
    this.server.listen(this.port);
  }
}

module.exports = SocketService;
