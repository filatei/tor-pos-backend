const PDFDocument = require('pdfkit');
const fs = require('fs');
const Path = require('path');
const { toDate } = require('date-fns');
const { end } = require('pdfkit');

function pdfKitCreate(record, dataCallBack, endCallBack) {
    // Create a document
    // record is a person record
    // let record = {fname:"first name", name:" full name", hireDate:new Date(), exitDate: new Date(),baseSalary:50000,
    //     jobName:'LOADER', site:{name:'KPANSIA'}}

    try {
        console.log(record, 'record in pdf servie')
        const doc = new PDFDocument();

        doc.on('data', dataCallBack);
        doc.on('end', endCallBack);
        // doc.fontSize(19).text('Appointment Letter for ' + record.name).end()
        // Pipe its output somewhere, like to a file or HTTP response
        // See below for browser usage
        // const outputFile = '/var/www/uploads/offers/appointment_' + record.fname +'.pdf';
        const logoFile = '/var/www/uploads/productimages/fidologo.png'
        // const logo = fs.readFileSync('/var/www/uploads/productimages/fidologo.png')
        // doc.pipe(fs.createWriteStream(outputFile));
        
        if(!record.baseSalary) {
        record.baseSalary = 'Based on Commission'
        }
        const today = new Date();
        const todayStr = today.toDateString();

        today.setDate( today.getDate() - 7 );
        const todayStrm7 = today.toDateString();
        const year = today.getFullYear();
        const month = today.getMonth();
        const day = today.getDay();
        const hour = today.getHours();
        const min = today.getMinutes();
        const seconds = today.getSeconds();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']


        const title = `\nAppointment Letter for ${record.name}\n\n`
        const address = record.site.address;
        const phone = record.site.phone;
        const salutation = `Dear ${record.fname},\n`
        let body = `You have been offered employment with us as ${record.jobName} as follows:\n\n`;
        body += `Effective Date:  ${todayStr}          \n`;
        body += `Base Salary:     ${record.baseSalary} \n`;
        body += `Site:             ${record.site.name}  \n`;
        const greeting = `Yours sincerely,\n\n\n\nDueremini Kings\nGeneral Manager\n`
        // Add an image, constrain it to a given size, and center it vertically and horizontally
        doc.image(logoFile,doc.page.width-110,20, {
        fit: [80, 80],
        align: 'right',
        // valign: 'center',
        });

        // Embed a font, set the font size, and render some text
        doc
        // .text(`\nFIDO WATERS LTD`, 520,50)
        .text(`${address}. Tel. ${phone}`, 20, doc.page.height - 50, {
            lineBreak: false
          })
          .underline( 20, doc.page.height - 40, 590, 12)
        .text(`${todayStrm7}\n\n`, 20,100)
        .font( Path.join(__dirname, "../fonts/PALAT32.ttf"))
        .fontSize(12)
        .text(salutation,20,140)
        .fontSize(16)
        .fillColor('red')
        .text(title,20, 150)
        .underline(20, 156, title.length*8, 27, { color: '#0000FF' })
        .fillColor('black')

        .fontSize(14)
        .text(body)
        .text("\n\n\n")
        .text(greeting)

        doc.end();
    } catch (error) {
        console.log(error)
    }
    

   
    
}

module.exports = {pdfKitCreate}