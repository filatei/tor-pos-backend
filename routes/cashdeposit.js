const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/user");
const Utils = require("../utils");
const { validationResult } = require("express-validator");

const Cashdeposit = require("../models/cashdeposit");
const Stockitem = require("../models/stockitem");
const Contact = require("../models/contact");
const Inventory = require("../models/inventory");
const Accesslog = require("../models/accesslog");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
const homedir = os.homedir();
const tokens = require(`${homedir}/.token.json`);
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const moment = require("moment");
const Mail = require("../mail");
const HttpError = require("../utils/http-error");

function logIncident(email, description) {
  const logObj = new Accesslog({ email: email, description: description });
  logObj
    .save(logObj)
    .then((result) => {
      console.log("access incident logged for user", result);
    })
    .catch((err) => {
      console.log("access logging error for user ", err);
    });
}

const checkAuth = require("../middleware/check-auth");

router.post(
  "",
  checkAuth,
  Utils.upload4.single("image"),
  async (req, res, next) => {
    const alloweds = ['ADMIN', 'GENERAL MANAGER', 'MANAGER', 'ACCOUNTANT', 'SNR ACCOUNTANT']

    if (!alloweds.includes(req.userData.role)) {
      // logIncident(req.userData.email, "Not allowed to create cash deposit");
      return res
        .status(500)
        .json({ message: "Not allowed to create cash deposit" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(422)
        .json({ message: "Invalid inputs passed, please check your data" });
    }

    try {
      let myPath = null;
      const file = req.file;
      let fileName;
      if (file) {
        fileName =
          "uploads/cashdeposit/" + req.userData.userId + "/" + file.filename;
        if (hostname.includes("torama.ng")) {
          url = "https://fido-api.torama.ng";
        } else {
          url = req.protocol + "://" + req.get("host");
        }

        myPath = url + "/" + file.path;

        myPath = myPath.replace('/var/www/','');
      }

      const { depositor, amount, site, payeeAcct } = req.body;

      const creator = req.userData.userId;
      const cashdepositObj = {
        status: "NOT SEEN",
        depositor,
        amount,
        site,
        payeeAcct,
        creator,
        image: myPath,
      };

      const cashdeposit = new Cashdeposit(cashdepositObj);

      cashdeposit
        .save()
        .then(async (result) => {
          const mailStat = await Mail.sendCashdeposit(result, req.userData);
          res.status(201).json({
            message: "Cash deposit added successfully",
            cashdeposit: { ...result, id: result._id },
          });
        })
        .catch((error) => {
          res.status(500).json({
            message: "Creating a cashdeposit failed! " + error,
          });
        });
    } catch (err) {
      res.status(500).json({
        message: "Creating a cashdeposit failed! " + err,
      });
    }
  }
);

router.put("/:id", checkAuth, async (req, res, next) => {

  try {
    const alloweds = ['ADMIN', 'GENERAL MANAGER', 'MANAGER', 'ACCOUNTANT', 'SNR ACCOUNTANT']
  
    if (!alloweds.includes(req.userData.role)) {
      return res.status(500).json({ message: "Not allowed to update cash deposit" });
    }

    const id = req.params.id;
    let user = req.userData;
    let cashObj = req.body;
    cashObj._id = id;
    cashObj.updater = req.userData.userId;


    const cashdeposit = new Cashdeposit(cashObj);

    Cashdeposit.updateOne({ _id: id }, cashdeposit)
      .then(async (result) => {
        if (result.n > 0) {
          const updated = await Cashdeposit.findById(id);
          if (updated && user) {
            const mailStat = await Mail.sendCashdeposit(updated, user);
          }
          

          res
            .status(200)
            .json({ message: "Update successful!", cashdeposit: result });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch((error) => {
        console.log(error)
        res.status(500).json({
          message: "Couldn't update cashdeposit! " + error,
        });
      });
    
  } catch (error) {
    res.status(500).json({
      message: "Couldn't update cashdeposit! " + error,
    });
    
  }
  
});

router.put("/status/:id", checkAuth, async (req, res, next) => {
  //  all directors are allowed to update status
  const alloweds = process.env.DIRECTORS;
  if (!alloweds.includes(req.userData.email)) {
    logIncident(
      req.userData.email,
      "Not allowed to update cash deposit status"
    );
    return res
      .status(500)
      .json({ message: "Not allowed to update cash deposit status" });
  }

  try {
    const { status } = req.body;
    if (!status.trim()) {
      return res.status(500).json({
        message: "empty status ",
      });
    }
    let mailStat;
    const user = req.userData;

    const cashdepositObj = await await Cashdeposit.findById(req.params.id);

    cashdepositObj.status = status;
    mailStat = await Mail.sendCashdeposit(cashdepositObj, user);
    Cashdeposit.updateOne({ _id: req.params.id }, { status: status })
      .then((result) => {
        if (result.n > 0) {
          res
            .status(200)
            .json({ message: "Update successful!", cashdeposit: result });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch((error) => {
        res.status(500).json({
          message: "Couldn't update cashdeposit! " + error,
        });
      });
  } catch (err) {
    res.status(500).json({ message: "Error in code!" + err });
  }
});

router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;
  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to delete ");
    return res.status(500).json({ message: "Not allowed" });
  }

  deleteCashdeposit();

  function deleteCashdeposit() {
    Cashdeposit.deleteOne({ _id: req.params.id })
      .then((result) => {
        if (result.n > 0) {
          res.status(200).json({ message: "Deletion successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch((error) => {
        console.error(error, "catch err");
        res.status(500).json({
          message: "Deleting cashdeposit failed! " + error,
        });
      });
  }
});

router.get("", checkAuth, async (req, res, next) => {
  try {
  
    let cash, cash2
    Cashdeposit.find().lean().sort({ createdAt: -1 }).limit(200).then ((result) => {
      let image = "";
      cash = result.map(c => {
        if (c.image && c.image.includes('/var/www')) {
          image = c.image.replace('/var/www','')
        } 
        return {...c, image }
      });
      res.status(200).json({ cashdeposit: cash });
    })
    .catch(err => {
      console.log('error in cashdeposit find' + err)
    })

    
  } catch (err) {
    return res.status(500).json({
      message: "Fetching Cash failed, please try again later." + err,
    });
  }
  
});

router.get("/:id", async (req, res, next) => {
  console.log(req.params.id);
  Cashdeposit.findById(req.params.id)
    .populate("creator")
    .then((cashdeposit) => {
      if (cashdeposit  ) {
        if ( cashdeposit.image )
        cashdeposit.image = cashdeposit.image.replace('/var/www','')

        res.status(200).json({ cashdeposit });
      } else {
        res.status(404).json({ message: "cashdeposit not found!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching cashdeposit failed! " + error,
      });
    });
});

module.exports = router;
