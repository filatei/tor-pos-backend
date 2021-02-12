const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/user");

const Expense = require("../models/expense");
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
const expense = require("../models/expense");

router.post("", checkAuth, function (req, res, next) {
  const alloweds = process.env.STOREALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to create Inventory");
    return res.status(500).json({ message: "Not allowed to create inventory" });
  }

  let expenseObj = req.body;

  expenseObj.creator = req.userData.userId;
  expenseObj.status = "DRAFT";

  const expense = new Expense(expenseObj);

  expense
    .save()
    .then((result) => {
      res.status(201).json({
        message: "Expense added successfully",
        expense: { ...result, id: result._id },
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Creating a expense failed! " + error,
      });
    });
});

router.put("/expenseAcct/:id", checkAuth, async (req, res, next) => {
  const alloweds = process.env.STOREALLOWEDS;
  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to create Inventory");
    return res.status(500).json({ message: "Not allowed to create inventory" });
  }

  const { expenseAccount } = req.body;
  console.log(expenseAccount, "expenseAcct");

  const id = req.params.id;
  const updater = req.userData.userId;

  Expense.updateOne(
    { _id: req.params.id },
    { expenseAccount: expenseAccount, updater }
  )
    .then((result) => {
      if (result.n > 0) {
        res
          .status(200)
          .json({ message: "Update successful!", expense: result });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Couldn't update expense! " + error,
      });
    });
});

router.put("/:id", checkAuth, async (req, res, next) => {
  const alloweds = process.env.STOREALLOWEDS;
  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to create Inventory");
    return res.status(500).json({ message: "Not allowed to create inventory" });
  }

  let expenseObj = req.body;
  let status = expenseObj.status;
  let mailStat;
  let updater = req.userData.userId;
  // console.log(updater);
  // update statusHistory
  let statusHist;
  const currExp = await Expense.findById(req.params.id);
  statusHist = {
    oldStatus: currExp.status,
    newStatus: status,
    updater: updater,
    // date: new Date(),
  };

  if (currExp && currExp.statusHistory) {
    expenseObj.statusHistory = [...currExp.statusHistory, statusHist];
  } else {
    expenseObj.statusHistory = [...statusHist];
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
      Mail.sendExpense(expenseObj, updater)
        .then((m) => {
          console.log(m, " m");
          mailStat = m;
        })
        .catch((err) => {
          console.log(err);
        });
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
  expenseObj._id = id;
  expenseObj.updater = req.userData.userId;
  const expense = new Expense(expenseObj);

  Expense.updateOne({ _id: req.params.id }, expense)
    .then((result) => {
      if (result.n > 0) {
        res
          .status(200)
          .json({ message: "Update successful!", expense: result });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Couldn't update expense! " + error,
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
    Expense.deleteOne({ _id: req.params.id })
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
          message: "Deleting expense failed! " + error,
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
      "SWALI",
      "OKUTUKUTU",
      "YENEGWE",
      "OBUNNA",
      "KPANSIA-E",
    ];

    let expenseQuery;

    // console.log("todaystart", startOfDay(new Date()), new Date());
    if (imprest) {
      console.log("in imprest");

      expenseQuery = await Expense.find({
        status: "APPROVED",
        expenseAccount: "Daily Imprest",
        updatedAt: { $gte: startOfDay(new Date()) },
      })
        .sort({ createdAt: -1 })
        .populate("vendor")
        .populate("creator")
        .limit(pageSize);
    } else if (req.userData.role === "ADMIN") {
      console.log("in directors");

      expenseQuery = await Expense.find()
        .sort({ createdAt: -1 })
        .populate("vendor")
        .populate("creator")
        .limit(pageSize);
    } else if (
      ["GENERAL MANAGER", "SNR ACCOUNTANT"].includes(req.userData.role)
    ) {
      console.log("general manager or snr accountant");
      // see all in designated field sites.
      expenseQuery = await Expense.find({
        site: { $in: sites },
      })
        .sort({ createdAt: -1 })
        .populate("vendor")
        .populate("creator")
        .limit(pageSize);
    } else if (req.userData.role === "MANAGER") {
      console.log("in managers");

      expenseQuery = await Expense.find({
        // if i own it, good. or if site is my site, good.
        $or: [{ creator: user[0]._id }, { site: req.userData.site }],
      })
        .sort({ createdAt: -1 })
        .populate("vendor")
        .populate("creator")

        .limit(pageSize);
    } else {
      console.log("in other");

      expenseQuery = await Expense.find({ creator: user[0]._id })
        .sort({ createdAt: -1 })
        .populate("vendor")
        .populate("creator")

        .limit(pageSize);
    }
    // console.log(expenseQuery);

    if (expenseQuery) {
      return res.status(200).json({
        expense: expenseQuery,
        message: "Expenses fetched Successfully",
      });
    } else {
      return res
        .status(500)
        .json({ message: "fetching expenses not successful" });
    }
  } catch (err) {
    return res
      .status(500)
      .json({ message: "fetching expenses not successful" + err });
  }
});

router.get("/mail/mailImprest", checkAuth, async (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to see Receipts");
    return res.status(500).json({ message: "Not allowed" });
  }
  const userName = req.userData.name;
  const userEmail = req.userData.email;

  const { searchTerm } = req.query;
  console.log(req.query, " req-query");
  // get array
  let records;
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const result = await Expense.find({
    createdAt: { $gte: startOfToday },
    expenseAccount: "Daily Imprest",
  }).sort({ createdAt: -1 });
  // mail result
  // console.log(result);
  await Mail.sendImprest(result, { name: userName, email: userEmail });
  if (result) return res.status(200).json({ expense: result });
  console.log(result);
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
  const result = await Expense.aggregate([
    { $match: { $text: { $search: searchTerm } } },
  ])
    .sort({ createdAt: -1 })
    .limit(200);

  if (result) return res.status(200).json({ expense: result });
  console.log(result);

  Expense.find({ $text: { $search: searchTerm } })
    .sort({ updatedAt: -1 })
    .populate("vendor")
    .populate("creator")
    .populate("updater")
    .limit(200)
    .then((record) => {
      if (record) {
        console.log(record);
        res.status(200).json({ expense: record });
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

router.get("/expense/:id", (req, res, next) => {
  const expId = req.params.id;
  Expense.find({ expense_id: expId })
    .populate("creator")
    .then((expense) => {
      if (expense) {
        res.status(200).json({ expense });
      } else {
        const error = new HttpError("expense not found!", 404);
        return next(error);
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching expense failed! " + error,
      });
    });
});

router.get("/:id", (req, res, next) => {
  Expense.findById(req.params.id)
    .populate("vendor")
    .populate("creator")
    .then((expense) => {
      if (expense) {
        res.status(200).json({ expense });
      } else {
        res.status(404).json({ message: "expense not found!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching expense failed! " + error,
      });
    });
});

router.put(
  "/notes/:id",
  checkAuth,
  Utils.upload2.any(),
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
            "uploads/expenses/" + req.userData.userId + "/" + file.filename;
        } else {
          fileName =
            "uploads/expenses/" + req.userData.userId + "/" + file.filename;
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

    let recId = req.params.id;
    await saveExpense();

    async function saveExpense() {
      try {
        if (myPath) {
          note.image = myPath;
        }

        let expObj = await Expense.findById(recId);

        // send mail with Note image
        let msent = await Mail.sendNote(note, expObj);

        let notes = expObj.notes;
        notes.push(note);
        // console.log(notes);
        log = expObj.log;
        log.push({
          updater: note.author,
          status: expObj.status,
          date: new Date(),
          note,
        });
        Expense.findByIdAndUpdate(
          { _id: recId },
          { notes: notes, updater: updater, log: log }
        )
          .then((result) => {
            // console.log(result);
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

router.post("/mail", checkAuth, function (req, res, next) {
  let expenseObj = req.body;
  expenseObj.creator = req.userData.userId;
});

module.exports = router;
