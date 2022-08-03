const path = require('path');
var fs = require('fs');
const User = require('./models/user')
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

// escpos.Network = require('escpos-network')

module.exports =  function () {
    this.printR = function(receipt) {
        try {
        device  = new escpos.USB()
        //console.log(device.findPrinter())
            // device  = new escpos.Network('192.168.1.4', 631);
        } catch {
            print('cant initialise device')
            return res.status(500).json({message: 'cant find printer'});
        }

        const customerName = receipt.header.customerName;
        let myDate = new Date(receipt.header.createDate).toString();
            myDate = myDate.replace('West Africa Standard Time', 'WA');
        let cartItems = receipt.mid.cartItems;
        const orderRef = receipt.header.orderRef
        // console.log('userid: ' + receipt.header.userId);
        let userName = receipt.userName;
        // console.log('username in print ', userName)
        printReceipt(receipt)

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
            let ean;
            if ( orderRef.length > 7) {
                console.log( orderRef );
                ean = 'EAN13'
            } else {
                orderRef = '0' + orderRef;
                console.log( orderRef );
                ean = 'EAN7'
            }
            
            device.open(function(error){
                if (error) {
                    console.error( error);
                    res.status(501).json({message: 'Print Device Error ' })
                }
                printer
                .font('a')
                .align('ct')
                .style('bu')
                .size(1, 1)
                // .image('https://fido-api.torama.ng/uploads/productmages/fidologo.png', 's8')
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
                .text('Served By: ' + receipt.header.userName)
                .newLine()
                .text('Customer: ' + customerName) // receipt.customer-name
                .text('Order Reference#: ' + orderRef)
                .text('Pay Method: ' + receipt.header.bankName)
                .text('Teller Id: ' + receipt.header.tellerId)
                .text('Date: '+ myDate.toString()) // receipt.date
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
                .text('SubTotal: ' +  new Intl.NumberFormat().format(receipt.mid.amount))
                .text('Tax: ' + receipt.mid.taxAmount)
                .text('Total After Tax: ' + new Intl.NumberFormat().format( receipt.mid.amountAfterTax))
                .text('Amount Paid: ' + new Intl.NumberFormat().format(receipt.mid.amountPaid)) 
                .text('Change: ' + change )
                .drawLine()
                .align('ct')
                .text(receipt.footer) // thank you message
                .align('ct')
                .barcode(orderRef, ean, 4)
                // .barcode(orderRef, 'EAN13', 4)
                // .qrimage('https://fidowater.ng/?order=' + orderRef, function(err){
                //     this.newLine()
                //     this.cut();
                //     console.log('receipt printed and cut: ' + new Date().toString())
                //     this.close();
                // })
                .newLine()
                .cut()
                .close()
            });
        }
    }
}