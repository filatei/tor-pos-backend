const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/user");
const Site = require("../models/site");
const Utils = require("../utils");
const { validationResult } = require("express-validator");

const Liability = require("../models/liability");
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
const liability = require("../models/liability");

router.post(
  "",
  checkAuth,
  Utils.upload6.single("image"),
  async (req, res, next) => {
    const alloweds = process.env.MANAGERS;

    if (!alloweds.includes(req.userData.email)) {
      logIncident(req.userData.email, "Not allowed to create cash deposit");
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
      let myPath = "";
      const file = req.file;
      let fileName;
      if (file) {
        fileName =
          "uploads/liability/" + req.userData.userId + "/" + file.filename;
        if (hostname.includes("torama.ng")) {
          url = "https://api.torama.ng";
        } else {
          url = req.protocol + "://" + req.get("host");
        }

        myPath = url + "/" + fileName;
      } else {
        console.log("no file");
      }

      const {
        liabType,
        amount,
        finalAmount,
        interest,
        tenor,
        site,
        startDate,
        endDate,
        bank,
        company,
        remarks,
      } = req.body;

      const creator = req.userData.userId;
      const balance = amount;

      const liabilityObj = {
        liabType,
        bank,
        site,
        status: "OPEN",
        company,
        remarks,
        amount,
        finalAmount,
        interest,
        tenor,
        balance,
        startDate,
        endDate,
        creator,
        image: myPath,
      };
      console.log(liabilityObj);
      const liability = new Liability(liabilityObj);

      liability
        .save()
        .then(async (result) => {
          console.log(result, " result ");
          //   const mailStat = await Mail.sendLiability(result, req.userData);
          res.status(201).json({
            message: "Liability added successfully",
            liability: { ...result, id: result._id },
          });
        })
        .catch((error) => {
          console.log(error);
          res.status(500).json({
            message: "Creating a liability failed! " + error,
          });
        });
    } catch (err) {
      console.log(err);

      res.status(500).json({
        message: "Creating a liability failed! " + err,
      });
    }
  }
);

router.put("/:id", checkAuth, async (req, res, next) => {
  console.log("entering put");
  const alloweds = process.env.ALLOWEDS;
  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to create Daily Report");
    return res
      .status(500)
      .json({ message: "Not allowed to create Daily Report" });
  }
  const id = req.params.id;
  let updated;
  let user = req.userData;
  const updater = req.userData.userId;

  const {
    liabType,
    amount,
    interest,
    finalAmount,
    tenor,
    payment,
    site,
    startDate,
    endDate,
    bank,
    company,
    balance,
    remarks,
    status,
  } = req.body;
  // console.log(payment, "payment");

  const liabilityObj = {};
  let payHistory = [];
  if (payment) {
    let liability = await Liability.findById(id).lean();

    if (!liability.balance) liability.balance = liability.amount;
    const balance = +liability.balance - payment.paidAmount;
    if (liability.payHistory === undefined || !liability.payHistory.length) {
      payHistory.push(payment);
    } else {
      payHistory = [...liability.payHistory, payment];
      // payHistorsy.push(payment);
    }
    console.log(liability, "liability", payHistory, "payHistory");

    const liab = await Liability.updateOne(
      { _id: id },
      { payment, balance, payHistory, updater }
    );
    console.log("liab", liab);
    updated = await Liability.findById(id);

    if (liab) {
      return res.status(200).json({
        message: " Liability Update successful!",
        liability: updated,
      });
    } else {
      return res.status(401).json({ message: "Not saved successfully!" });
    }
  }

  if (liabType) liabilityObj.liabType = liabType;

  if (bank) liabilityObj.bank = bank;
  if (site) liabilityObj.site = site;
  if (company) liabilityObj.company = company;
  if (status) liabilityObj.status = status;
  if (remarks) liabilityObj.remarks = remarks;
  if (amount) liabilityObj.amount = amount;
  if (interest) liabilityObj.interest = interest;
  if (finalAmount) liabilityObj.finalAmount = finalAmount;
  if (tenor) liabilityObj.tenor = tenor;
  if (balance) liabilityObj.balance = balance;
  if (startDate) liabilityObj.startDate = startDate;
  if (endDate) liabilityObj.endDate = endDate;
  if (updater) liabilityObj.updater = updater;
  liabilityObj._id = id;
  let mailStat;

  Liability.updateOne({ _id: id }, liabilityObj)
    .then(async (result) => {
      if (result.n > 0) {
        updated = await Liability.findById(id);
        // mailStat = await Mail.sendLiability(updated, user);
        console.log(result, liabilityObj, "result liabobj");
        res.status(200).json({
          message: " Liability Update successful!",
          liability: updated,
        });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Couldn't update liability! " + error,
      });
    });
});

router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;
  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to delete ");
    return res.status(500).json({ message: "Not allowed" });
  }

  deleteLiability();

  function deleteLiability() {
    Liability.deleteOne({ _id: req.params.id })
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
          message: "Deleting liability failed! " + error,
        });
      });
  }
});

router.get("", checkAuth, async (req, res, next) => {
  try {
    const directors = process.env.DIRECTORS;

    if (!directors.includes(req.userData.email)) {
      return;
    }
    let pageSize = +req.query.pagesize;
    if (!pageSize) pageSize = 200;
    const currentPage = +req.query.page;
    let liam = await Liability.find({})
      .lean()
      .populate("creator")
      .populate("site")
      .sort({ createdAt: -1 })
      .limit(pageSize);
    const liab = liam.map((l) => ({
      ...l,
      site: l.site.name,
      creator: l.creator.name,
    }));

    res.status(200).json({ liability: liab });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Fetching Liability failed" + err,
    });
  }
});

router.get("/:id", async (req, res, next) => {
  console.log(req.params.id);
  Liability.findById(req.params.id)
    .populate("creator")
    .populate("site")
    .then((liability) => {
      if (liability) {
        liability.site = liability.site.name;
        liability.creator = liability.creator.name;
        res.status(200).json({ liability });
      } else {
        res.status(404).json({ message: "liability not found!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching liability failed! " + error,
      });
    });
});

router.put(
  "/notes/:id",
  checkAuth,
  Utils.upload6.any(),
  async function (req, res, next) {
    const alloweds = process.env.ALLOWEDS;

    if (!alloweds.includes(req.userData.email)) {
      logIncident(req.userData.email, "Not allowed to create notes");
      return res.status(500).json({ message: "Not allowed" });
    }

    let updater = req.userData.userId;
    console.log(updater, "updater");
    let myPath;
    if (req.files) {
      let fileName;
      req.files.forEach((file) => {
        if (file.originalname == "blob") {
          fileName =
            "uploads/liability/" + req.userData.userId + "/" + file.filename;
        } else {
          fileName =
            "uploads/liability/" + req.userData.userId + "/" + file.filename;
        }

        if (hostname.includes("torama.ng")) {
          url = "https://api.torama.ng";
        } else {
          url = req.protocol + "://" + req.get("host");
        }

        myPath = url + "/" + fileName;
      });
    }
    const note = req.body;
    // console.log(note, "note");
    let recId = req.params.id;
    await saveLiability();

    async function saveLiability() {
      try {
        if (myPath) {
          note.image = myPath;
        }

        let libObj = await Liability.findById(recId).lean();

        // send mail with Note image
        // let msent = await Mail.sendNote(note, expObj);

        let notes = libObj.notes;
        notes.push(note);
        // console.log(notes);
        log = libObj.log;
        log.push({
          updater: note.author,
          status: libObj.status,
          date: new Date(),
          note,
        });
        Liability.findByIdAndUpdate(
          { _id: recId },
          { notes: notes, updater: updater, log: log }
        )
          .then((result) => {
            console.log(result);
            res.status(201).json({
              message: " note with image updated successfully",
              expense: {
                ...result,
                id: result._id,
              },
            });
          })
          .catch((error) => {
            res.status(500).json({
              message: "Creating an Image upload failed! " + error,
            });
          });
      } catch (err) {
        res.status(500).json({
          message: "Error with update in try block " + err,
        });
      }
    }
  }
);

module.exports = router;
