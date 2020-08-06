require('dotenv').config();
const express = require("express");
const router = express.Router();
const fs = require('fs');
const checkAuth = require('../middleware/check-auth');
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const Mail = require("../models/mail");
const homedir = require('os').homedir();
const tokens = require(`${homedir}/.token.json`);

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
    
   
    let mailObj = req.body;
    // const mail = new Mail(mailObj);
    console.log("Mail request came", mailObj);


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
   let logo = 'https://api.torama.ng/uploads/productimages/fidologo.png' || mailObj.logo;
   let date = new Date(mailObj.date).toDateString() || new Date().toDateString()
   let header = `<!DOCTYPE html><html><body><div style=" margin: auto; align=center;padding: 10px;"><img src=${logo} alt="logoimg" width="50"><p style="background:rgba(0, 128, 0,0.051); text-align:center;">${date}</p>`;
   let mailBody = mailObj.html || new Date().getTime();
   let subject = mailObj.subject || `Message from ShopTorama App`
   // let customer = mailObj.customer 
   let toEmail = mailObj.email
   let footer = `<h6><b>ShopTorama</b>- All rights reserved.${new Date().getFullYear()}</h6>`;

   const mailOptions = {
        from: `ShopTorama ${process.env.tormail}`,
        to: toEmail,
        bcc: process.env.tormail,
        subject: subject,
        generateTextFromHTML: true,
        html:  `${header} ${mailBody} ${footer} </body></html>`
    };

// send mail
    smtpTransport.sendMail(mailOptions, (error, response) => {
        if (error) {
          smtpTransport.close();
          return res.status(500).json({
            message: "Couldn't send mail! " + error
          });
        }
        if (response) {
          smtpTransport.close();
          return res.status(200).json({ message: "Mail successful sent!", response });
        }
        
    });
    


  
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


