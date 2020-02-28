const path = require('path');
// var printer = require('printer');
const ThermalPrinter = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;
var fs = require('fs');
const electron = require('electron')
// const electron = typeof process !== 'undefined' && process.versions && !!process.versions.electron;
 
// var info = fs.readFileSync('ticket.txt').toString();
    

exports.print = (req, res) => {
    let file = req.query.filename;
    file = path.join(__dirname, '..', 'data', file);
    
    let printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: 'printer:EPSON TM-T20II',
       driver: MyCustomDriver,
        options:{                                                 // Additional options
            timeout: 5000                                           // Connection timeout (ms) [applicable only for network printers] - default: 3000
          }
      });
      
      async function prt() {
        let isConnected = await printer.isPrinterConnected();       // Check if printer is connected, return bool of status
        let execute = await printer.execute();                      // Executes all the commands. Returns success or throws error
        let raw = await printer.raw(Buffer.from("Hello world"));    // Print instantly. Returns success or throws error
        printer.print("Hello World");                               // Append text
        printer.println("Hello World");                             // Append text with new line
        printer.openCashDrawer();                                   // Kick the cash drawer
        printer.cut();                                              // Cuts the paper (if printer only supports one mode use this)
        printer.partialCut();                                       // Cuts the paper leaving a small bridge in middle (if printer supports multiple cut modes)
        printer.beep();                                             // Sound internal beeper/buzzer (if available)
        printer.upsideDown(true);                                   // Con
      }

      prt()
    }