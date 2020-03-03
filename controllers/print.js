process.setMaxListeners(0);
const path = require('path');
var fs = require('fs');
const electron = require('electron')
const Order = require('../models/order');
const Customer = require('../models/customer');
const escpos = require('escpos');
escpos.USB = require('escpos-usb');



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
   // const orderId = req.query.orderid;
   const receipt = req.body
   const customerName = receipt.header.customerName;
   const myDate = receipt.header.createDate;
   let cartItems = receipt.mid.cartItems;
   console.log('receipt ', receipt);
   printReceipt(receipt);

   function printReceipt(data) {
    // install escpos-usb adapter module manually
    
    // Select the adapter based on your printer type
    // prter = escpos.USB.findPrinter()
    // console.log(prter)
    device  = new escpos.USB()
    // const device  = new escpos.Network('localhost');
    // const device  = new escpos.Serial('/dev/usb/lp0');

    const options = { encoding: "GB18030", "includeParity": false /* default */ }
    // encoding is optional

    const printer = new escpos.Printer(device, options);
    let orderDetails

    // let cartItems = [
    //     {
    //       prodId: '5e42ab2f1e2807574d4bf2c6',
    //       name: '19L Dispenser Refill',
    //       price: 400,
    //       qty: 50,
    //       amount: 20000.00
    //     }, 
    //     {
    //         prodId: '5e42ab2f1ehjhhjhbf2c6',
    //         name: 'Fido Pure Water',
    //         price: 70,
    //         qty: 1000,
    //         amount: 700000.00
    //       }

    //   ];
    
    device.open(function(error){
        if (error) {
            res.status(503).json({
                message: "Printer Error!"
            });
        }
       // if(!printer) process.exit(1);
        printer
        .font('a')
        .align('ct')
        .style('bu')
        .size(1, 1)
        .text(receipt.header.company)
        .align('ct') // or 'RT'
        .text(receipt.header.address.street + ', ' +
            receipt.header.address.city + ', ' + receipt.header.address.state)
        .align('ct')
        .text('Tel: ' + receipt.header.phone + ' | email: ' +
            receipt.header.email)
        .align('ct')
        .drawLine()
        .align('lt')
        .text('Customer: ' + customerName) // receipt.customer-name
        const orderRef = receipt.header.orderRef.split(' - ')[1]
        printer
        .text('Order Reference#: ' + orderRef)
        .text('Pay Method: ' + receipt.header.bankName)
        .text('Teller Id: ' + receipt.header.tellerId)
        .text('Date: '+ myDate) // receipt.date
        .newLine()
        
       // .barcode('1234567', 'CODE39') // skip
       // .table(["Product", "Qty", "Price", "Amount"])
       .tableCustom([ // table header
        { text:'Product', align:"LEFT", width:0.55 },
        { text:'Qty', align:"RIGHT", width:0.15},
        { text:'Price', align:"RIGHT", width:0.15},
        { text:'Amount', align:"RIGHT", width:0.15 } 
        ])

        cartItems.forEach( item => {
            printer.tableCustom([ //receipt.cart-items
                { text:item.name, align:"LEFT", width:0.55 },
                { text:item.qty, align:"RIGHT", width:0.15},
                { text:item.price, align:"RIGHT", width:0.15},
                { text:item.amount, align:"RIGHT", width:0.15 },   
            ])
        })
        const change = parseInt(receipt.mid.amountAfterTax,10) - parseInt(receipt.mid.amountPaid,10)
        printer
        .align('ct')
        .text('SubTotal: ' + receipt.mid.amount)
        .text('Tax: ' + receipt.mid.taxAmount)
        .text('Total After Tax: ' + receipt.mid.amountAfterTax)
        .text('Amount Paid: ' + receipt.mid.amountPaid)
        .text('Change: ' + change )
        .drawLine()
        .align('ct')
        .text(receipt.footer) // thank you message
        .text('Served By: ' + receipt.header.userName)
        
        .align('lt')
        // .qrimage('https://fidowater.ng', function(err){
        //   this.cut();
        //   this.close();
        // })
        .newLine()
        .cut()
        .close()
      });
      res.json({'message': 'Receipt Printed'})  
   }

    // Order.findById(orderId).then(order => {
    //     if (order) {
    //        //console.log(order)
    //     // print(order) 
    //     let customerName = order.customerName
    //     let orderRef = order.orderRef
    //     let customerId = order.customer
    //     console.log(customerId)
       
        
       
       
    //     console.log(printer)

    //     // printers.forEach(function(iPrinter, i){
    //     //     console.log('' + i + 'ppd for printer "' + iPrinter.name + '":' + util.inspect(printer.getPrinterDriverOptions(iPrinter.name), {colors:true, depth:10} ));
    //     //     console.log('\tselected page size:'+ printer.getSelectedPaperSize(iPrinter.name) + '\n');
    //     // });
          
    //     } else {
    //       console.log("order not found!");
    //     }
    //   })
    //   .catch(error => {
    //    console.error("Fetching order failed!");
        
    //   });

      
   
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