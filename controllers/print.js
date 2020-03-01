const path = require('path');
var fs = require('fs');
const electron = require('electron')
const Order = require('../models/order');
const Customer = require('../models/customer');

const escpos = require('escpos');
// install escpos-usb adapter module manually
escpos.USB = require('escpos-usb');
// Select the adapter based on your printer type
const device  = new escpos.USB();
// const device  = new escpos.Network('localhost');
// const device  = new escpos.Serial('/dev/usb/lp0');

const options = { encoding: "GB18030", "includeParity": false /* default */ }
// encoding is optional

const printer = new escpos.Printer(device, options);


// var lp = require("node-lp");
// var options = {};
 
// printer = lp(options);
// printer.queue('./test.txt', (res) => {
//     console.log(res)
// })
// var qz = require('qz-tray');
// qz.api.setPromiseType(require('q').Promise);
// qz.api.setWebSocketType(require('ws'));
// var printer = require("printer");
// console.log(printer)
// util = require('util'),
// printers = printer.getPrinters();
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
           //console.log(order)
        // print(order) 
        let customerName = order.customerName
        let orderRef = order.orderRef
        let customerId = order.customer
        console.log(customerId)
        device.open(function(error){
            printer
            .font('a')
            .align('ct')
            .style('bu')
            .size(1, 1)
            .text('TORAMA INNOVATION HUB')
            .text('---------------------')
            .text('Customer: '+ customerName)
            .barcode('1234567', 'CODE39')
            .table(["Product", "Qty", "Price", "Amount"])
            .tableCustom([
              { text:"Left123456678", align:"LEFT", width:0.25 },
              { text:"Left 2", align:"LEFT", width:0.25},
              { text:"Center", align:"CENTER", width:0.25},
              { text:"Right", align:"RIGHT", width:0.25 },
              { text:"Left123456678", align:"LEFT", width:0.25 },
              { text:"Left 2", align:"LEFT", width:0.25},
              { text:"Center", align:"CENTER", width:0.25},
              { text:"Right", align:"RIGHT", width:0.25 }
            ])
            .qrimage('https://fidowater.ng', function(err){
              this.cut();
              this.close();
              
            });
          });
        
       
       
        console.log(printer)

        // printers.forEach(function(iPrinter, i){
        //     console.log('' + i + 'ppd for printer "' + iPrinter.name + '":' + util.inspect(printer.getPrinterDriverOptions(iPrinter.name), {colors:true, depth:10} ));
        //     console.log('\tselected page size:'+ printer.getSelectedPaperSize(iPrinter.name) + '\n');
        // });
          
        } else {
          console.log("order not found!");
        }
      })
      .catch(error => {
       console.error("Fetching order failed!");
        
      });

      
   
    // function print(order) {
    //     qz.websocket.connect()
    //     .then(qz.printers.getDefault)
    //     .then(function(printer) {
    //          console.log("The default printer is: " + printer);
    //          //barcode data
    //          var code = '12345';
    //          //convenience method
    //         var chr = function(n) { return String.fromCharCode(n); };
    //         var barcode = '\x1D' + 'h' + chr(80) +   //barcode height
    //              '\x1D' + 'f' + chr(0) +              //font for printed number
    //              '\x1D' + 'k' + chr(69) + chr(code.length) + code + chr(0); //code39
    //         var config = qz.configs.create(printer);
    //         let header = '\nTORAMA INNOVATION HUB\n__________________\n';
    //         let orderDate = (new Date(order.createdAt)).toDateString() + '\n';
    //         let prtData = 'Date: '+ orderDate + '\nRef: ' + order.orderRef +'\n';
    //          prtData = prtData + 'Amount: ' + order.amount + '\n';
    //          let items = "Product\t\tQty\tRate\tAmount\n"
    //          order.cartItems.forEach(c => {
    //              items = items + c.name + '\t' + c.qty.toString() + '\t' + c.price.toString() + '\t' + c.amount.toString() + '\n'
    //          })
    //         // let cartItems = JSON.stringify(order.cartItems[0]);
    //         const newlines = '\n\n\n\n\n\n';
    //         let customer = order.customername;
    //         let bank = order.bankName
    //         console.log(order.customer, orderDate)
    //         orderAmt =  order.amount.toLocaleString('en-NG', {
    //             style: 'currency', currency: 'NGN',
    //         })

    //         customer = 'customer: ' + order.customerName  + '\n' + items + 'Total: ' + orderAmt + '\n'
                
    //        return  qz.print(config, [header + customer + orderDate + prtData + items + '\n' + barcode + newlines]);
           
    //        // qz.print(config, [header + customer + orderDate + prtData + items + '\n' + barcode + newlines]);
            
    //     })
    //     .then(qz.websocket.disconnect)
    //     .then(function() {
    //       // process.exit(0);
    //     })
    //     .catch(function(err) {
    //        console.error(err);
    //        process.exit(1);
    //     });
    // }
    
    
}