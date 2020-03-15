process.setMaxListeners(0);
const path = require('path');
var fs = require('fs');
// const electron = require('electron')
// const Order = require('../models/order');
// const Customer = require('../models/customer');
const User = require('../models/user')
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

// escpos.Network = require('escpos-network')

exports.print = (req, res) => {
    // let file = req.query.filename;
   // file = path.join(__dirname, '..', 'data', file);
   // const orderId = req.query.orderid;
    try {
       device  = new escpos.USB()
       //console.log(device.findPrinter())
        // device  = new escpos.Network('192.168.1.4', 631);
    } catch {
        console.error('cant initialise device')
        return res.status(500).json({message: 'cant find printer'});
        
    }
   const receipt = req.body
   const customerName = receipt.header.customerName;
   const myDate = receipt.header.createDate;
   let cartItems = receipt.mid.cartItems;
   const orderRef = receipt.header.orderRef.split(' - ')[1]
    // console.log('userid: ' + receipt.header.userId);
    let userName = req.userData.name;
    // console.log('username in print ', userName)
    printReceipt(receipt);
//    User.findById(receipt.header.userId).then( (user) => {
//        console.log(receipt.header.userId)
//        console.log(user)

//         if (user) {
//             userName = user.name;
//             printReceipt(receipt);
//         } else {
//             console.log('print: not valid user')
//             return;
//         }
//    })
  // console.log('receipt ', receipt);
    
   function printReceipt(data) {
    // install escpos-usb adapter module manually
    
    // Select the adapter based on your printer type
    // prter = escpos.USB.findPrinter()
    // console.log(prter)
    
    // const device  = new escpos.Network('localhost');
    // const device  = new escpos.Serial('/dev/usb/lp0');

    const options = { encoding: "GB18030" /* default */ }
    // encoding is optional

    // const printer = new escpos.Printer(device, options);
    const printer = new escpos.Printer(device, options);
    
    device.open(function(error){
        if (error) {
            throw error
        }
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
        .text('Served By: ' + userName)
        .align('lt')
        .qrimage('https://fidowater.ng', function(err){
            this.newLine()
            this.cut();
            this.close();
        })
        // .newLine()
        // .cut()
        // .close()
      });
      res.json({'message': 'Receipt Printed'})  
   }
}