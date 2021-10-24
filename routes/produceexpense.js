const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/user");

const Produceexpense = require("../models/produceexpense");
const Stockitem = require("../models/stockitem");
const Producecontact = require("../models/producecontact");
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
const produceexpense = require("../models/produceexpense");

router.post("", checkAuth, function (req, res, next) {
  const alloweds = process.env.STOREALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to create Produceexpense");
    return res
      .status(500)
      .json({ message: "Not allowed to create Produceexpense" });
  }

  let produceexpenseObj = req.body;

  produceexpenseObj.creator = req.userData.userId;
  produceexpenseObj.status = "DRAFT";

  const produceexpense = new Produceexpense(produceexpenseObj);

  produceexpense
    .save()
    .then((result) => {
      res.status(201).json({
        message: "Produceexpense added successfully",
        produceexpense: { ...result, id: result._id },
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Creating a produceexpense failed! " + error,
      });
    });
});

router.put("/produceexpenseAcct/:id", checkAuth, async (req, res, next) => {
  const alloweds = process.env.STOREALLOWEDS;
  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to create Produceexpense");
    return res
      .status(500)
      .json({ message: "Not allowed to create Produceexpense" });
  }

  const { produceexpenseAccount } = req.body;
  // console.log(produceexpenseAccount, "produceexpenseAcct");

  const id = req.params.id;
  const updater = req.userData.userId;

  Produceexpense.updateOne(
    { _id: req.params.id },
    { produceexpenseAccount: produceexpenseAccount, updater }
  )
    .then((result) => {
      if (result.n > 0) {
        res
          .status(200)
          .json({ message: "Update successful!", produceexpense: result });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Couldn't update produceexpense! " + error,
      });
    });
});

router.put("/:id", checkAuth, async (req, res, next) => {
  const alloweds = process.env.STOREALLOWEDS;
  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to create Produceexpense");
    return res
      .status(500)
      .json({ message: "Not allowed to create produceexpense" });
  }

  let produceexpenseObj = req.body;
  let status = produceexpenseObj.status;
  let updater = req.userData.userId;
  // console.log(updater);
  // update statusHistory
  let statusHist;
  const currExp = await Produceexpense.findById(req.params.id);
  statusHist = {
    oldStatus: currExp.status,
    newStatus: status,
    updater: updater,
    // date: new Date(),
  };

  if (currExp && currExp.statusHistory) {
    produceexpenseObj.statusHistory = [...currExp.statusHistory, statusHist];
  } else {
    produceexpenseObj.statusHistory = [...statusHist];
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
      const mailStat = await Mail.sendProduceexpense(
        produceexpenseObj,
        updater
      );
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
  produceexpenseObj._id = id;
  produceexpenseObj.updater = req.userData.userId;
  const produceexpense = new Produceexpense(produceexpenseObj);

  Produceexpense.updateOne({ _id: req.params.id }, produceexpense)
    .then((result) => {
      if (result.n > 0) {
        res
          .status(200)
          .json({ message: "Update successful!", produceexpense: result });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Couldn't update produceexpense! " + error,
      });
    });
});

router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;
  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to delete ");
    return res.status(500).json({ message: "Not allowed" });
  }

  deleteProduceexpense();

  function deleteProduceexpense() {
    Produceexpense.deleteOne({ _id: req.params.id })
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
          message: "Deleting produceexpense failed! " + error,
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
      "KPANSIA E",
    ];

    const blockSites = ["OKUTUKUTU-BLOCKS", "AGADAGBA-BLOCKS"];

    let produceexpenseQuery;

    if (imprest) {
      produceexpenseQuery = await Produceexpense.find({
        status: "APPROVED",
        produceexpenseAccount: "Daily Imprest",
        updatedAt: { $gte: startOfDay(new Date()) },
      })
        .sort({ createdAt: -1 })
        .populate("vendor")
        .populate("creator")
        .limit(pageSize);
    } else if (req.userData.role === "ADMIN") {
      // console.log("in directors");

      produceexpenseQuery = await Produceexpense.find()
        .sort({ createdAt: -1 })
        .populate("vendor")
        .populate("creator")
        .limit(pageSize);
    } else if (
      ["GENERAL MANAGER", "SNR ACCOUNTANT"].includes(req.userData.role)
    ) {
      console.log("general manager or snr accountant");
      // see all in designated field sites.
      produceexpenseQuery = await Produceexpense.find({
        site: { $in: sites },
      })
        .sort({ createdAt: -1 })
        .populate("vendor")
        .populate("creator")
        .limit(pageSize);
    } else if (req.userData.role === "MANAGER") {
      console.log("in managers");

      produceexpenseQuery = await Produceexpense.find({
        // if i own it, good. or if site is my site, good.
        $or: [{ creator: user[0]._id }, { site: req.userData.site }],
      })
        .sort({ createdAt: -1 })
        .populate("vendor")
        .populate("creator")

        .limit(pageSize);
    } else {
      produceexpenseQuery = await Produceexpense.find({ creator: user[0]._id })
        .sort({ createdAt: -1 })
        .populate("vendor")
        .populate("creator")

        .limit(pageSize);
    }

    if (produceexpenseQuery) {
      return res.status(200).json({
        produceexpense: produceexpenseQuery,
        message: "Produceexpenses fetched Successfully",
      });
    } else {
      return res
        .status(500)
        .json({ message: "fetching produceexpenses not successful" });
    }
  } catch (err) {
    return res
      .status(500)
      .json({ message: "fetching produceexpenses not successful" + err });
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
  const result = await Produceexpense.find({
    createdAt: { $gte: startOfToday },
    produceexpenseAccount: "Daily Imprest",
  }).sort({ createdAt: -1 });
  // mail result
  // console.log(result);
  await Mail.sendImprest(result, { name: userName, email: userEmail });
  if (result) return res.status(200).json({ produceexpense: result });
});

router.get("/getByText", checkAuth, async (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to see Receipts");
    return res.status(500).json({ message: "Not allowed" });
  }

  const { searchTerm } = req.query;
  // get array
  let records;
  const result = await Produceexpense.aggregate([
    { $match: { $text: { $search: searchTerm } } },
  ])
    .sort({ createdAt: -1 })
    .limit(200);

  if (result) return res.status(200).json({ produceexpense: result });

  Produceexpense.find({ $text: { $search: searchTerm } })
    .sort({ updatedAt: -1 })
    .populate("vendor")
    .populate("creator")
    .populate("updater")
    .limit(200)
    .then((record) => {
      if (record) {
        res.status(200).json({ produceexpense: record });
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

router.get("/produceexpense/:id", (req, res, next) => {
  const expId = req.params.id;
  Produceexpense.find({ produceexpense_id: expId })
    .populate("creator")
    .then((produceexpense) => {
      if (produceexpense) {
        res.status(200).json({ produceexpense });
      } else {
        const error = new HttpError("produceexpense not found!", 404);
        return next(error);
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching produceexpense failed! " + error,
      });
    });
});

router.get("/:id", (req, res, next) => {
  Produceexpense.findById(req.params.id)
    .populate("vendor")
    .populate("creator")
    .then((produceexpense) => {
      if (produceexpense) {
        res.status(200).json({ produceexpense });
      } else {
        res.status(404).json({ message: "produceexpense not found!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching produceexpense failed! " + error,
      });
    });
});

router.put(
  "/notes/:id",
  checkAuth,
  Utils.upload22.any(),
  async function (req, res, next) {
    const alloweds = process.env.ALLOWEDS;

    if (!alloweds.includes(req.userData.email)) {
      logIncident(req.userData.email, "Not allowed to create notes");
      return res.status(500).json({ message: "Not allowed" });
    }

    let updater = req.userData.userId;
    let recId = req.params.id;
    let myPath;
    const note = req.body;

    if (req.files) {
      req.files.forEach((file) => {
        if (hostname.includes("torama.ng")) {
          url = "https://api.torama.ng";
        } else {
          url = req.protocol + "://" + req.get("host");
        }

        myPath = url + "/" + file.path;
        note.image = myPath;
      });
    }
    await saveProduceexpense();

    async function saveProduceexpense() {
      try {
        // if (myPath) {
        //   note.image = myPath;
        // }

        let expObj = await Produceexpense.findById(recId);
        // send mail with Note image
        // let msent = await Mail.sendNote(note, expObj);

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
        Produceexpense.findByIdAndUpdate(
          { _id: recId },
          { notes: notes, updater: updater, log: log }
        )
          .then((result) => {
            res.status(201).json({
              message: " note with image updated successfully",
              produceexpense: {
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
  let produceexpenseObj = req.body;
  produceexpenseObj.creator = req.userData.userId;
});

module.exports = router;
