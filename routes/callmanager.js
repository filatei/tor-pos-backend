const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/user");

const CallManager = require("../models/callmanager");
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
const Utils = require("../utils");
const HttpError = require("../utils/http-error");
const startOfDay = require("date-fns/startOfToday");

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

router.post("", checkAuth, function (req, res, next) {
  const alloweds = process.env.STOREALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to create CallManager");
    return res.status(500).json({ message: "Not allowed to create CallManager" });
  }

  let callManagerObj = req.body;

  callManagerObj.creator = req.userData.userId;
  callManagerObj.status = "DRAFT";

  const callmanager = new CallManager(callManagerObj);

  callmanager
    .save()
    .then((result) => {
      res.status(201).json({
        message: "CallManager added successfully",
        callmanager: { ...result, id: result._id },
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Creating a callmanager failed! " + error,
      });
    });
});


router.put("/:id", checkAuth, async (req, res, next) => {
  const alloweds = process.env.STOREALLOWEDS;
  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to create CallManager");
    return res.status(500).json({ message: "Not allowed to create callmanager" });
  }

  let callManagerObj = req.body;
  let status = callManagerObj.status;
  let updater = req.userData.userId;
  // console.log(updater);
  // update statusHistory
  let statusHist;
  const currExp = await CallManager.findById(req.params.id);
  statusHist = {
    oldStatus: currExp.status,
    newStatus: status,
    updater: updater,
    // date: new Date(),
  };

  if (currExp && currExp.statusHistory) {
    callManagerObj.statusHistory = [...currExp.statusHistory, statusHist];
  } else {
    callManagerObj.statusHistory = [...statusHist];
  }

  async function isOpen() {
    if (
      status === "OPEN" ||
      status === "APPROVED" ||
      status === "PAID" ||
      status === "DECLINED" ||
      status === "VALIDATED" ||
      status === "REVIEWED" ||
      status === "PART-PAY"
    ) {
      //  send mail
      const mailStat = await Mail.sendExpense(callManagerObj, updater);
    }
  }
  isOpen()
    .then((sm) => {
      console.log("mailstat sent");
    })
    .catch((err) => {
      console.log(err, "send err");
    });

  const id = req.params.id;
  const oldExpense = await CallManager.findById(id);
  callManagerObj._id = id;
  callManagerObj.updater = req.userData.userId;
 
  // console.log(callManagerObj, 'callManagerObj')

  const callmanager = new CallManager(callManagerObj);
  if (status !== 'PAID') {
    callmanager.balance =  callmanager.balance || callmanager.txn_amount;
  }

  console.log(callManagerObj.txn_amount, callManagerObj.balance, 'txnamt bal ')
  callmanager.notes = oldExpense.notes;

  CallManager.updateOne({ _id: req.params.id }, callmanager)
    .then((result) => {
      if (result.n > 0) {
        res
          .status(200)
          .json({ message: "Update successful!", callmanager: result });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Couldn't update callmanager! " + error,
      });
    });
});

router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;
  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to delete ");
    return res.status(500).json({ message: "Not allowed" });
  }

  deleteExpense();

  function deleteExpense() {
    CallManager.deleteOne({ _id: req.params.id })
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
          message: "Deleting callmanager failed! " + error,
        });
      });
  }
});

router.get("", checkAuth, async (req, res, next) => {
  try {
    const pageSize = +req.query.pagesize;
    const currentPage = +req.query.page;
    const imprest = req.query.imprest;
    const userEmail = req.userData.email;
    const user = await User.find({ email: userEmail });
    const directors = process.env.DIRECTORS;
    const generalManagers = process.env.GENERALMANAGERS;
    const managers = process.env.MANAGERS;
    const sites = [
        "KPANSIA",
        "AKENFA",
        "SWALI",
      "OKUTUKUTU",
      "YENEGWE",
      "OBUNNA",
      "KPANSIA E",
    ];

    const blockSites = ["OKUTUKUTU-BLOCKS", "AGADAGBA-BLOCKS"];

    let callManagerQuery;

    // console.log("todaystart", startOfDay(new Date()), new Date());
    if (imprest) {
      callManagerQuery = await CallManager.find({
        status: "APPROVED",
        callManagerAccount: "Daily Imprest",
        updatedAt: { $gte: startOfDay(new Date()) },
      })
        .sort({ createdAt: -1 })
        .populate("vendor")
        .populate("creator")
        .limit(pageSize);
    } else if (req.userData.role === "ADMIN") {
      // console.log("in directors");

      callManagerQuery = await CallManager.find()
        .sort({ createdAt: -1 })
        .populate("creator")
        .limit(pageSize);
    } else if (
      ["GENERAL MANAGER", "SNR ACCOUNTANT"].includes(req.userData.role)
    ) {
      console.log("general manager or snr accountant");
      // see all in designated field sites.
      callManagerQuery = await CallManager.find({
        site: { $in: sites },
      })
        .sort({ createdAt: -1 })
        .populate("creator")
        .limit(pageSize);
    } else if (req.userData.role === "MANAGER") {
      console.log("in managers");

      callManagerQuery = await CallManager.find({
        // if i own it, good. or if site is my site, good.
        $or: [{ creator: user[0]._id }, { site: req.userData.site }],
      })
        .sort({ createdAt: -1 })
        .populate("creator")

        .limit(pageSize);
    } else {
      console.log("in other");

      callManagerQuery = await CallManager.find({ creator: user[0]._id })
        .sort({ createdAt: -1 })
        .populate("creator")

        .limit(pageSize);
    }
    // console.log(callManagerQuery);

    if (callManagerQuery) {
      return res.status(200).json({
        callmanager: callManagerQuery,
        message: "Calls fetched Successfully",
      });
    } else {
      return res
        .status(500)
        .json({ message: "fetching callManagers not successful" });
    }
  } catch (err) {
    return res
      .status(500)
      .json({ message: "fetching callManagers not successful" + err });
  }
});


router.get("/getByText", checkAuth, async (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to see Receipts");
    return res.status(500).json({ message: "Not allowed" });
  }

  const { searchTerm } = req.query;
  console.log(req.query, " req-query");
  // get array
  let records;
  const result = await CallManager.aggregate([
    { $match: { $text: { $search: searchTerm } } },
  ])
    .sort({ createdAt: -1 })
    .limit(200);
  

  if (result) return res.status(200).json({ callmanager: result });
  console.log(result);

  CallManager.find({ $text: { $search: searchTerm } })
    .sort({ updatedAt: -1 })
    .populate("creator")
    .populate("updater")
    .limit(200)
    .then((record) => {
      if (record) {
        console.log(record);
        res.status(200).json({ callmanager: record });
      } else {
        res.status(404).json({ message: "record not found!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching record failed!" + error,
      });
    });
});



router.get("/:id", (req, res, next) => {
  CallManager.findById(req.params.id)
    .populate("vendor")
    .populate("creator")
    .then((callmanager) => {
      if (callmanager) {
        res.status(200).json({ callmanager });
      } else {
        res.status(404).json({ message: "callmanager not found!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching callmanager failed! " + error,
      });
    });
});

router.put(
  "/notes/:id",
  checkAuth,
  Utils.uploadCall.any(),
  async function (req, res, next) {
    const alloweds = process.env.ALLOWEDS;

    if (!alloweds.includes(req.userData.email)) {
      logIncident(req.userData.email, "Not allowed to create notes");
      return res.status(500).json({ message: "Not allowed" });
    }

    let updater = req.userData.userId;
    console.log(updater, "updater here ");
    let myPath;
    // console.log(req.files, "files");
    if (req.files) {
      let fileName;
      req.files.forEach((file) => {
        if (hostname.includes("torama.ng")) {
          url = "https://api.torama.ng";
        } else {
          url = req.protocol + "://" + req.get("host");
        }

        // myPath = url + "/" + file.path;
        console.log(file.path, 'file path')

        myPath = url + '/callManagerUploads/' + file.path.split('/var/www/uploads/calls')[1]
        console.log(myPath, 'myPath')

      });
    }
    const note = req.body;
    let recId = req.params.id;
    await saveExpense();

    async function saveExpense() {
      try {
        if (myPath) {
          note.image = myPath;
        }

        let expObj = await CallManager.findById(recId);
        // send mail with Note image
        // let msent = await Mail.sendNote(note, expObj);
        let notes;
        if (expObj) {
            notes = expObj.notes || [];
            notes.push(note);
        }
        else {
            return res.status(500).json({
                message: "Call not in DB " ,
              });
        }
        
        // console.log(notes);
        
        CallManager.findByIdAndUpdate(
          { _id: recId },
          { notes: notes, updater: updater }
        )
          .then((result) => {
            return res.status(201).json({
              message: " note with image updated successfully",
              callmanager: {
                ...result,
                id: result._id,
              },
            });
          })
          .catch((error) => {
            return res.status(500).json({
              message: "Creating an Image upload failed! " + error,
            });
          });
      } catch (err) {
        return res.status(500).json({
          message: "Error with update  " + err,
        });
      }
    }
  }
);

router.post("/mail", checkAuth, function (req, res, next) {
  let callManagerObj = req.body;
  callManagerObj.creator = req.userData.userId;
});

module.exports = router;
