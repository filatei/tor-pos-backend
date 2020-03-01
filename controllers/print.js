const path = require('path');
var fs = require('fs');
const electron = require('electron')
const Order = require('../models/order');
const Customer = require('../models/customer');
var qz = require('qz-tray');
qz.api.setPromiseType(require('q').Promise);
qz.api.setWebSocketType(require('ws'));

// var RSVP = require('rsvp');
// var promise = new RSVP.Promise(function(resolve, reject){});
// var qz = require("qz-tray");
// qz.api.setPromiseType(function promise(resolver) { return new Promise(resolver); });
// var WebSocket = require('ws');
// qz.api.setWebSocketType(WebSocket);
// const electron = typeof process !== 'undefined' && process.versions && !!process.versions.electron;
// var info = fs.readFileSync('ticket.txt').toString();
    let cust;
exports.print = (req, res) => {
    // let file = req.query.filename;
   // file = path.join(__dirname, '..', 'data', file);
   const orderId = req.query.orderid;
   console.log(orderId);
   
    Order.findById(orderId).then(order => {
        if (order) {
           // console.log(order)
         print(order) 
          
        } else {
          console.log("order not found!");
        }
      })
      .catch(error => {
       console.error("Fetching order failed!");
        
      });
   
    function print(order) {
        qz.websocket.connect()
        .then(qz.printers.getDefault)
        .then(function(printer) {
             console.log("The default printer is: " + printer);
             //barcode data
             var code = '12345';
             //convenience method
            var chr = function(n) { return String.fromCharCode(n); };
            var barcode = '\x1D' + 'h' + chr(80) +   //barcode height
                 '\x1D' + 'f' + chr(0) +              //font for printed number
                 '\x1D' + 'k' + chr(69) + chr(code.length) + code + chr(0); //code39
            var config = qz.configs.create(printer);
            let header = '\nTORAMA INNOVATION HUB\n__________________\n';
            let orderDate = (new Date(order.createdAt)).toDateString() + '\n';
            let prtData = 'Date: '+ orderDate + '\nRef: ' + order.orderRef +'\n';
             prtData = prtData + 'Amount: ' + order.amount + '\n';
            let cartItems = JSON.stringify(order.cartItems[0]);
            const newlines = '\n\n\n\n\n\n';
            getCustomerName(order.customer)
            const customer = 'customer: ' + cust  + '\n';
            return qz.print(config, [header + customer + orderDate + prtData + cartItems + '\n' + barcode + newlines]);
            
        })
        .then(qz.websocket.disconnect)
        .then(function() {
          // process.exit(0);
        })
        .catch(function(err) {
           console.error(err);
           process.exit(1);
        });
    }
    
    function getCustomerName(id) {
        //let cust;
        Customer.findById(id)
        .then(customer => {
            if (customer) {
                cust = customer.name
            } else {
                console.error('customer not found')
                }
        })
        .catch(error => {
            console.error(error)
        });
        
    }
  
    //   function prt() {
    //     qz.websocket.connect().then(function() {
    //         return qz.printers.find();
    //      }).then(function(printers) {
    //         console.log(printers);
    //      }).then(function() {
    //         return qz.websocket.disconnect();
    //      }).then(function() {
    //         process.exit(0);
    //      }).catch(function(err) {
    //         console.error(err);
    //         process.exit(1);
    //      });                                 // Con
    //   }

      //prt()
    }