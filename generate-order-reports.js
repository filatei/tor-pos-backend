// const Mail = require("nodemailer/lib/mailer");
require("dotenv").config();
const path = require("path");
const os = require("os");
const moment = require("moment");
const hostname = os.hostname();
const homedir = os.homedir();
const tokens = require(`${homedir}/.token.json`);
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const oauth2Client = new google.auth.OAuth2(
    tokens.clientID,
    tokens.clientSecret,
    tokens.redirectURL
  );
  
  oauth2Client.setCredentials({
    refresh_token: tokens.refresh_token,
  });

const FidoOrder = require('./models/fidoorder');
const User = require('./models/user');
const Site = require('./models/site');
const Customer = require('./models/customer');
const Terminal = require('./models/terminal');
const Product = require('./models/product');

const mongoose = require('mongoose');
const XLSX = require('xlsx');

let logo = "https://api.torama.ng/uploads/productimages/fidologo.jpg";

const PRODUCTNAME = { "Pure Water": "PUREWATER", "19L Dispenser Refill": "DISPENSER", 
                "19L Dispenser Replace":"DISPENSER", "75cl Crate":"CRATE75CL", 
                "50cl Crate":"CRATE50CL", "Nylon Waste":"WASTES", "Cement":"CEMENT", 
                "9-inch Block":"BLOCK", "6-inch Block":"BLOCK" }

const PID = process.pid;
mongoose.set("useUnifiedTopology", true);
mongoose.set("useCreateIndex", true);
mongoose.set("useFindAndModify", false);

mongoose
    .connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME,
      user: process.env.DB_USER,
      pass: process.env.DB_PASS,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      autoIndex: true,
      useCreateIndex: true
    }).then(() => {
    console.log(`Connected to DB,  process id ${PID}`);
  })
  .catch((err) => {
    console.log('error in connection to DB ', err);
  });

  mongoose.connection.on('error', (err) => {
    console.log(' error in mongoose connection', err)
  })

  mongoose.connection.on('disconnect', () => {
    console.log('mongoose disconnected')
  })

  let attachments = []

  async function sendEodOrders() {
   
    const date = new Date().toLocaleDateString('en-GB').replace(/\//g,'_')
   
    
    const fullDate = new Date().toLocaleDateString('en-GB');
    const subject = `EOD Order Reports for ${fullDate}`;
    
    let html = `<!DOCTYPE html><html><body style="text-align:center;"><img src="${logo}" alt="logoimg" width="50">
          <h2> End of Day Report for ${fullDate}</h2><p> Hi, Attached are Today's EOD Reports.</p><br><br><br> `;
          
          html += `<h4 style="background:rgba(0, 128, 0,0.033);text-align:center"> Powered by Torama<sup>&#174;</sup> - All rights reserved. &#169; ${fullDate}</p> </body></html>`;
  
          if (hostname.includes("torama")) {
            toEmail = 'dailyreports@gtsng.com';
            creatorEmail = 'sales@torama.ng';
            bccMail = ''
          } else {
            toEmail = null;
            toEmail = "orderManagers@torama.ng";
  
            creatorEmail = null;
            bccMail = null;
          }
  
          const to = creatorEmail;
          const sender = process.env.tormail;
          const cc = toEmail;
          const bcc = bccMail;
          const body = html;
          let model;
  
          model = {
            fromText: `EOD Order Report`,
            subject,
            to: creatorEmail,
            cc: toEmail,
            bcc: bcc,
            html,
            attachments: attachments
            // [
        
            //   {   // file on disk as an attachment
            //       filename: fileName,
            //       path: filePath // stream this file
            //   },
              
            // ]
          };
          console.log(model.attachments, 'attachments')
            mailer(model);

  }

  async function mailer(model) {
    const accessToken = await oauth2Client.getAccessToken();
    const smtpTransport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.tormail,
        clientId: tokens.clientID,
        clientSecret: tokens.clientSecret,
        refreshToken: tokens.refresh_token,
        accessToken: accessToken,
        pool: true,
      },
    });
  
    const mailOptions = {
      from: `${model.fromText} ${process.env.tormail}`,
      to: model.to,
      cc: model.cc,
      bcc: model.bcc,
      subject: model.subject,
      generateTextFromHTML: true,
      html: model.html,
      attachments: model.attachments
    };
  
    console.log(model.attachments, 'attachments')
    if( !model.attachments.length) {
        console.log('no attachments, exiting...')
        process.kill(process.pid, "SIGTERM");
    }
    // send mail
    smtpTransport.sendMail(mailOptions, (error, response) => {
      let result;
      if (error) {
        console.log(error);
        result = false;
      } else {
        result = true;
      }
      smtpTransport.close();
      process.kill(process.pid, "SIGTERM");
      return result;
    });
  }


async function getSiteOrdersForToday( site) {
    try {
        // const userId = req.userData.userId; 
        // const site = req.userData.site; 
        // console.log(userId, 'userid');
    
        // start of today
        var start = moment().startOf("day").toDate();
    
        // end today
        var end = moment(start).endOf("day").toDate();
    
        // for site today
        let orders =  await FidoOrder.find({trans_date: { $gte: start, $lte: end },$or: [{ site: site }]}) .lean()
        .sort({trans_date:-1})
        .limit(400)
        .populate('creator')
        .populate('customer')
        .populate('terminal_id')
    
        orders = orders.map((o) => {
          if (!o.acquirer) {
            o.acquirer = 'CASH';
          }
          return o;
        })
        // console.log(orders)
        return orders;
    
        // res.status(200).json({message: 'Orders fetched successfully', fidoorders:orders})
    
      } catch (error) {
        console.log(error)
        throw error
        // return res.status(500).json({message: 'Error fetching orders - ' + error})
      }

}

function json2excel( orders,site) { 
    try {
        if ( !orders.length ) return;
        if ( !site ) return;
        const today= new Date().toLocaleDateString('en-GB').replace(/\//g,'_');
    
        const worksheet = XLSX.utils.json_to_sheet(orders);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook,worksheet,'orders')
    
        // generate buffer
        XLSX.write(workbook, {bookType:'xlsx', type:'buffer'})
    
        // generate binary
        XLSX.write(workbook, {bookType:'xlsx', type:'binary'})
    
        const fileName = `${site}-order-${today}.xlsx`;
        const filePath = `/tmp/${fileName}`;
        // generate buffer
        XLSX.writeFile(workbook, filePath)
        attachments.push({filename:fileName, path: filePath})
    } catch (error) {
        console.log(error)
        throw error;
    }
    
  
}

async function mailEodReport( ) {

    const users = await User.find().lean();
    const sites = await Site.find().lean();
    // console.log( sites)
    let site = 'KPANSIA E'
    
    sites.map( async s => {
        if (!s.name) return;

        site = s.name;
        const  orders = await getSiteOrdersForToday( s.name);
        // console.log(orders)
        console.log(s.name, orders.length)

        if (orders && orders.length) {
            json2excel( reFormatOrders(orders), s.name); // creates in tmp dir excel file containing reports
            // we are sending all attachments in one email to dailyreports@gtsng.com

           
            // console.log(users)
            const manager = users.filter(u => u.role === 'MANAGER' && u.site === s.name)[0];
            const accountant = users.filter(u => u.role === 'ACCOUNTANT' && u.site === s.name)[0];
            const secretary = users.filter(u => u.role === 'SECRETARY' && u.site === s.name)[0];
            if (secretary && s.name === 'KPANSIA E') {
                // await sendEodOrders(formattedOrders, secretary)
                return 0;
            }
            if (manager && s.name !== 'OKUTUKUTU') {
                // await sendEodOrders(formattedOrders, manager)
                return 0;
            }

            if (s.name === 'OKUTUKUTU' && accountant) {
                // await sendEodOrders(orders, accountant)
                return 0;
            }

        }
        else return 1;
    })  
    console.log('sending report')
    await sendEodOrders()    
}

  let formattedOrders;

function reFormatOrders(data) {
    const today = new Date().toLocaleDateString('en-GB').replace(/\//g,'');
    if (!data.length){
        return;
    }
    const replacer = (key, value) => value === null ? '' : value; // specify how you want to handle null values here
    let header = Object.keys(data[0]);
    let orderRow
    let orderArr = [];
    let sn = 1;
    let bankVal;
    data.map(row => {
        let products = []
        
        header.map(field => {
        if( field === 'fidoOrderId' ) {
            orderRow = {...orderRow, "ORDER ID": row[field]}
        }
        
        if( field === 'customer' ) {
            orderRow = {...orderRow, CUSTOMER: row[field].name}
        }

        if( field === 'orderType' ) {
            orderRow = {...orderRow, orderType: row[field]}
        }

        if( field === 'action_taken' ) {
            orderRow = {...orderRow, "ACTION TAKEN": row[field]}
        }

        if( field === 'trans_date' ) {
            orderRow = {...orderRow, "INVOICE DATE": new Date(row[field]).toLocaleDateString('en-GB')}
        }

        if( field === 'creator' ) {
            orderRow = {...orderRow, USER: row[field].name}
        }

        if( field === 'paidAmount' ) {
            orderRow = {...orderRow, AMT_PAID: row[field]}
        }

        if( field === 'txn_amount' ) {
            orderRow = {...orderRow, AMT_TOTAL: row[field], AMOUNT: row[field]}
        }

        if( field === 'terminal_location' ) {
            orderRow = {...orderRow, LOCATION: row[field]}
        }

        // if( field === 'paymentMethod' ) {
        //   orderRow = {...orderRow, "PAYMENT METHOD": row[field]}
        // }
        
        if( (field == 'paymentMethod')  ) {
            orderRow = {...orderRow, "PAYMENT METHOD": row[field] }
        }
        

        if( field === 'teller_id' ) {
            orderRow = {...orderRow, "TELLER NO": row[field]}
        }

        if( field === 'date_teller' ) {
            orderRow = {...orderRow, "TELLER DATE": row[field]}
        }

        if( field === 'acquirer' ) {
            orderRow = {...orderRow, "BANK": row[field] + ' (NGN)'}
        }

        if( field === 'amt_teller' ) {
            orderRow = {...orderRow, "TELLER AMOUNT": row[field]}
        }

        if( field === 'auth_id' ) {
            orderRow = {...orderRow, "AUTH_ID": row[field]}
        }

        if( field === 'rrn' ) {
            orderRow = {...orderRow, "RRN": row[field]}
        }

        if( field === 'tx_ref' ) {
            orderRow = {...orderRow, "TX_REF": row[field]}
        }

        if( field === 'transfer_from_account_name' ) {
            orderRow = {...orderRow, "transfer_from_account_name": row[field]}
        }

        if( field === 'transfer_from_bank' ) {
            orderRow = {...orderRow, "transfer_from_bank": row[field]}
        }

        if( field === 'company' ) {
            orderRow = {...orderRow, "COMPANY": row[field]}
        }

        if( field === 'status' ) {
            orderRow = {...orderRow, STATUS: row[field]}
        }
        if( field === 'products' ) {
            // create new products object to convert multiple products to multiple orders
            row[field].map(p => {
            products = [...products, {name: p.name , qty:p.qty, price: p.price}]
            
            })
        }
        })

        // convert multiple products to multiple orders
        products.map(p => {
        orderArr.push({SN: sn, ...orderRow, PRODUCT: PRODUCTNAME[p.name] , QTY:p.qty, RATE: p.price, AMT_TOTAL:p.qty*p.price,
            AMOUNT:p.qty*p.price, 
            AMT_PAID:p.qty*p.price})
            sn = sn + 1;
        })

    })

    header = Object.keys(orderArr[0]);

    // console.log(orderArr[0])
    formattedOrders = orderArr;
    hours = new Date().getHours();
    return formattedOrders;
}

async function main() {
    try {
        const mailSend = await mailEodReport();
        process.on('SIGTERM', () => {
            console.info('SIGTERM signal received.');
            mongoose.connection.close(false, () => {
                console.log('MongoDb connection closed.');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.info('SIGINT signal received.');
            mongoose.connection.close(false, () => {
                console.log('MongoDb connection closed.');
                process.exit(0);
            });
        });
    } catch (error) {
        console.log(error)
        throw error
    }
    
}

main();

// module.exports = { main }
  