require('dotenv').config();
const express = require("express");
const router = express.Router();
const fs = require('fs');
const checkAuth = require('../middleware/check-auth');
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const Mail = require("../models/mail");

// console.log(tokens.access_token)

router.get('',(req, res, next) => {
  const pageSize = +req.query.pagesize ;
  const currentPage = +req.query.currentpage;
  const sort = req.query.sort;

  let mailQuery = Mail.find().sort({ date:-1 }).populate('terminal_id');
  if (pageSize && currentPage) {
    mailQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  
  mailQuery
    .then(documents => {
      res.status(200).json({
        mails: documents
      });
    })
    .catch(error => {
      res.status(500).json({
        message: "Fetching mails failed! " + error
      });
    });
});

router.get("/:id",  (req, res, next) => {
  // console.log('id ', req.params.id)
  // console.log(req.userData.userId)
  Mail.findById(req.params.id).populate('terminal_id')
  .then(mail => {
    if (mail) {
      // console.log(mail)
      res.status(200).json({mail: mail});
    } else {
      res.status(404).json({ message: "mail not found!" });
    }
  })
  .catch(error => {
    res.status(500).json({
      message: "Fetching mail failed!"
    });
  });
});

router.post("", (req, res, next) =>  {
    //   const alloweds = process.env.ALLOWEDS;
    //   if ( !alloweds.includes(req.userData.email)) {
    //     return res.status(500).json({message: 'Not allowed'});

    //   }
    const homedir = require('os').homedir();
    const tokens = require(`${homedir}/.token.json`);
    let user = req.body;
    console.log("Mail request came");
//     const oauth2Client = new OAuth2(
//         "Your ClientID Here", // ClientID
//         "Your Client Secret Here", // Client Secret
//         "https://developers.google.com/oauthplayground" // Redirect URL
//    );

//     oauth2Client.setCredentials({
//         refresh_token: "Your Refresh Token Here"
//     });
//     const accessToken = oauth2Client.getAccessToken()

    const smtpTransport = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: process.env.tormail, 
            clientId: tokens.clientID,
            clientSecret: tokens.clientSecret,
            refreshToken: tokens.refresh_token,
            accessToken: tokens.access_token
        }
   });

   // some content
   let orderId = req.body.orderId || new Date().getTime();
   let subject = req.body.subject || `ShopTorama Order Confirmation for Order (# ${orderId})`
   let curr = req.body.curr || process.env.naira
   let total = req.body.total || '5,000.00'
   
   let customer = req.body.customer || 'Kurokimi Tiamiyu'
   let products = req.body.products || [{name: 'Pure Water', qty: 50, amount: 5050}, {name: '19L Dispense Water', qty: 10, amount: 5000}]


   let product = `<table><tr> <th>Product</th><th>Amount</th></tr>`;
   products.forEach(p => {
    product += `<tr><td>${p.qty} x ${p.name}</td><td>${curr} ${p.amount} </td><tr>`
   })
   product += `</table>`;
  
   let html = `<h3>ORDER CONFIRMED</h3><p> Hi ${customer},</p>`;
   html += `<p>We received your order # ${orderId} for ${curr} ${total}.</p>`;
   html += `<h3>Products</h3> ${product}`;
   html += `<h5>Order summary</h5><p> Subtotal: ${curr} ${total} </p> <p>Tax: N 0.00</p> <p>Total: ${curr} ${total}</p>`;
   
   html += `<footer>ShopTorama - All rights reserved</footer>`;

   const mailOptions = {
        from: `ShopTorama ${process.env.tormail}`,
        to: process.env.tormail,
        subject: subject,
        generateTextFromHTML: true,
        html: html
    };

// send mail
smtpTransport.sendMail(mailOptions, (error, response) => {
    error ? console.log(error) : console.log(response);
    smtpTransport.close();
});
    
    // let credentials;
    // let tokens;
    // let client_id
    // let client_secret
    // let refresh_token
    // let access_token;
    // let expiry_date;
    // let transporter;
    // Load client secrets from a local file.
    // fs.readFile('./credentials.json', (err, content) => {
    //     if (err) return console.log('Error loading client secret file:', err);
    //     credentials = JSON.parse(content);
    //     console.log(credentials);
        
        
//         const {client_secret, client_id, redirect_uris} = credentials.installed;
//         transporter = nodemailer.createTransport({
//             host: 'smtp.gmail.com',
//             port: 465,
//             secure: true,
//             auth: {
//                 type: 'OAuth2',
//                 clientId: client_id,
//                 clientSecret: client_secret,
//             }
//         });

//         const TOKEN_PATH = './token.json'
//     // Check if we have previously stored a token.
//    fs.readFile(TOKEN_PATH, (err, token) =>   {
//     if (err) return console.log('Error loading token file:', err);
//     tokens = JSON.parse(token);
//     // console.log(tokens);
//     // const { access_token, expiry_date} = tokens;

//     transporter.sendMail({
//         from: process.env.tormail,
//         to: process.env.tormail,
//         subject: 'Message',
//         text: 'I hope this message gets through!',
//         auth: {
//             user: process.env.tormail,
//             refreshToken: process.env.refresh_token,
//             accessToken: process.env.access_token,
//             expires: process.env.expiry_date
//         }
//     });
//         // Authorize a client with credentials, then call the Google Tasks API.
//         // authorize(JSON.parse(content), listConnectionNames);
//     });
    
    

   
   //  callback(oAuth2Client);
//   });

  


  
    // transporter.sendMail({
    //     from: process.env.tormail,
    //     to: process.env.tormail,
    //     subject: 'Message',
    //     text: 'I hope this message gets through!',
    //     auth: {
    //         user: process.env.tormail
    //     }
    // });

    // let transporter = nodemailer.createTransport({
    //     host: 'smtp.gmail.com',
    //     port: 465,
    //     secure: true,
    //     auth: {
    //         type: 'OAuth2',
    //         user: process.env.tormail,
    //         serviceClient: '114184352404995523727',
    //         private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCyBeoPSVt8ck5x\nVuufQkD2nomJOSNYcPCT3pOk/K7X1xkxdphcfZpEzJbT3k1//sfQQG0tDrT1Go9w\nI8h8ggurSQmE5YYOROocJ534TxARuDk4TqctKPLCqutyUUuYlk0Y8BkoXAfEKnrV\nFJKJqJPxRL+KrHVErMkcZ+wwG3ChCalYBm/sbpuWXa4DogXg5gFbllVkqLgrW3ov\nOAuqbJNHp0pIKT68OLCobty5tRB8p1d3x/OtWiuIycV9Q5YjdfFLHtuiL1I3kp4a\nQGxl0eugwLYfVDhajRbpacei5BmLIgKa5eWis1olIsn58Lxve3iYLfANhb6arVeV\npb473kmTAgMBAAECggEABdheM4tKkYmlRrZpEnfCmfZho1uja/YlXWLmVnlPelnJ\n2M8Wje7if6t3W6nbFz6egUQkRuGf58Or/a1xxJjL2PS9zHBxguAYubzumbvAK3zG\nMDGbmUbUwGHhTNsbetKbNxw8ZJAFAe1ieW2X/s9wsBrRmTQ0E4Gthse+FbmeQe35\nF/9HIVvktwEzVoNS/s1p54JawY9HP2fvqDc3yL4uocVLYIAF6KtdXCKZ2UhUUzDI\nZE+H2Dp8c/JG78vrXUcBs2n4SdZ05fZOv+qZ0eS90LBSUYURSNLs36fJvx4ACZ14\niZ+7ZZbKGM+nafMpH87167FdhCJaleNYwvfNhGadnQKBgQDY1pWdt14WHiiCLOYj\n1hsOiY9GjXsJYUnTAbxw+dme8HJs7gtN/60D2DmkZ5QP3OcGb5YKni1StlTGP+XE\n6ZPkj2l3+LAUunxSSc/B1FlymdAgojEsiy+2AqrtQH9DweGNHh5a3mX8yIRYE0sO\nsGBav6qnJ747cVUsRcPiIF1vtwKBgQDSLLsP4Ebmo58SX78N8jyUDS763TO7wTk9\n/dnTwnFwqwxbs3RIVXJkC1wQqKMpK4a0y7BgBEAPABf6SzQow2z8zQmskqplyfSu\npnZKBq/Oz8MJvV+f0cxpdRyNYiqP1sDyRh8ASgUwM4uFoynX++N90KqjbrozkA/R\nko5s0/e9BQKBgCtKS/x8y0/nHXc/t4KYEDbKx8vyGwo4XiC+S/zSJNxSbMXKkH81\n+Di4RmnINAsmswjZ5j6gbbQBqtMZlqnFaD1NVGUbRSwePwu+qLetyV3Tz3V0bBTU\nhOX1imJraf0BDCK8TJsfo4TgE2vyDh4UoGf9s/hDOvtrGPIJy52tkHnpAoGAUzoj\nWUYWzX49n6kKnxstofMWh4DQ26jIYiQD/jchdNxHKIkHox0zDyrwaihddBAoZ6/B\nSERmmYoP9K2TGhFJN1J6Yjwx/dzbZ83DSc0cEWl0cobrNv59U8VsaRBWil8gSNA7\ntoGZTF0dAu55w22byFa5O769PW3u1a6Td8T4dYECgYApJgLilhAkQHoJo92gEeDS\nOXtkMIcRWfsbo+UehDVTpQcpf4Jy53l5DEkyD8SrJ9PFaBn9CrDTUYcDf2kDo0JP\nzYk+CimBOdVtt0Srgqe7r3rdiDe55vu+BiegzroMEWTDyT2IssGV2GL/6XMFRcxV\ny0PoYFSRXsvu2TKjiZEV7A==\n-----END PRIVATE KEY-----\n",
            
    //         accessToken: 'ya29.Xx_XX0xxxxx-xX0X0XxXXxXxXXXxX0x',
    //         expires: 1484314697598
    //     }
    // });
        

        // const transporter = nodemailer.createTransport({
        //   host: process.env.gSmtp,
        //   port: process.env.gPort,
        //   secure: false,
        //   auth: {
        //     user: process.env.tormail,
        //     pass: process.env.torpass
        //   }
        // });

    //     const mailOptions = {
    //         from: process.env.tormail,
    //         to: process.env.tormail,
    //         subject: "Sales order from ShopTorama",
    //         html: "<h1>And here is the place for HTML</h1>"
    //       };

    //       transporter.sendMail(mailOptions, callback);

    // }
    
    
    
    // sendMail(user, (err, info) => {
    //     if (err) {
    //     console.log(err);
    //     res.status(400).json({ error: "Failed to send email" + err })
      
    //     } else {
    //     console.log("Email has been sent");
    //     res.status(200).json( {mess: info } );
    //     }
    // });

  let mailObj = req.body;
  console.log(mailObj, 'mailobj');

  // mailObj.creator = req.userData.userId;

  const mail = new Mail(mailObj);
  //  console.log(mail);
//   mail.save().then ((result)=> {
//     // console.log(result)
//     res.status(201).json({
//       message: "Mail added successfully",
//       mail: {
//         ...result,
//         id: result._id
//       }
//     });
//   })
//   .catch(error => {
//     res.status(500).json({
//       message: "creating mails failed! " + error
//     });
//   });
});
  
router.put("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
    return res.status(500).json({message: 'Not allowed'});
  }
  
  let mailObj = req.body;
  mailObj._id = req.params.id;
  mailObj.updater = req.userData.userId; 
  const mail = new Mail(mailObj);

  Mail.updateOne({ _id: req.params.id }, mail)
  .then(result => {
    if (result.n > 0) {
      res.status(200).json({ message: "Update successful!" });
    } else {
      res.status(401).json({ message: "Not authorized!" });
    }
  })
  .catch(error => {
    res.status(500).json({
      message: "Couldn't update mail! " + error
    });
  });
});

router.delete("/:id", (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;
  if ( !alloweds.includes(req.userData.email)) {
    return res.status(500).json({message: 'Not allowed'});
  }

  Mail.deleteOne({ _id: req.params.id })
    .then(result => {
      if (result.n > 0) {
        res.status(200).json({ message: "Deletion successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
      })
    .catch(error => {
    res.status(500).json({
      message: "Deleting mail failed! " + error
    });
  });
});

module.exports = router;


