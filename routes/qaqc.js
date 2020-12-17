const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/user");

const Qaqc = require("../models/qaqc");
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
const DIRECTORS = process.env.DIRECTORS;
const MANAGERS = process.env.MANAGERS;

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
const qaqc = require("../models/qaqc");

router.post(
  "",
  checkAuth,
  Utils.upload3.single("image"),
  async (req, res, next) => {
    const alloweds = process.env.QAQCALLOWEDS;

    if (!alloweds.includes(req.userData.email)) {
      logIncident(req.userData.email, "Not allowed to create QA/QC Ticket");
      return res
        .status(500)
        .json({ message: "Not allowed to create qa/qc ticket" });
    }

    let qaqcObj = req.body;
    console.log(req.body);
    qaqcObj.alarm = false;
    if (parseInt(qaqcObj.observationScale) < parseInt(qaqcObj.refRangescale)) {
      qaqcObj.alarm = true;
    }

    qaqcObj.creator = req.userData.userId;
    qaqcObj.status = "DRAFT";

    let file = req.file;
    let myPath;

    if (file) {
      let fileName;
      fileName = "uploads/qaqc/" + req.userData.userId + "/" + file.filename;

      if (hostname.includes("torama.ng")) {
        url = "https://api.torama.ng";
      } else {
        url = req.protocol + "://" + req.get("host");
      }

      myPath = url + "/" + fileName;
      qaqcObj.image = myPath;
      qaqcObj.images = [myPath];
    }

    // console.log(qaqcObj);
    const qaqc = new Qaqc(qaqcObj);
    console.log(qaqc, "qaqc");

    qaqc
      .save()
      .then((result) => {
        return res.status(201).json({
          message: "QA Report added successfully",
          qaqc: { ...result, id: result._id },
        });
      })

      .catch((error) => {
        console.log(error);
        return res.status(500).json({
          message: "Creating a QA report failed! " + error,
        });
      });
  }
);

router.put(
  "/:id",
  checkAuth,
  Utils.upload3.single("image"),
  async (req, res, next) => {
    const alloweds = process.env.QAQCALLOWEDS;
    if (!alloweds.includes(req.userData.email)) {
      logIncident(req.userData.email, "Not allowed to create qa/qc ticket");
      return res
        .status(500)
        .json({ message: "Not allowed to create qa/qc ticket" });
    }
    const id = req.params.id;
    let qaqcObj = req.body;
    let status = qaqcObj.status;

    let file = req.file;
    let myPath;

    console.log(file);
    if (file) {
      let fileName;
      fileName = "uploads/qaqc/" + req.userData.userId + "/" + file.filename;

      if (hostname.includes("torama.ng")) {
        url = "https://api.torama.ng";
      } else {
        url = req.protocol + "://" + req.get("host");
      }

      myPath = url + "/" + fileName;
      qaqcObj.image = myPath;
    }
    // if just status update
    if (!qaqcObj.itemName && !qaqcObj.category && !myPath && status) {
      // update only status
      const upstat = await Qaqc.updateOne({ _id: id }, { status: status });
      if (status === "OPEN" || status === "REVIEWED") {
        //  send mail
        let mObj = await Qaqc.findById(id);
        let mailStat = await Mail.sendQaqc(mObj);
      }
      return res
        .status(200)
        .json({ message: "Update Status successful! ", upstat });
    }
    const qaObj = await Qaqc.findById(id);
    const images = qaObj.images;
    if (myPath) images.push(myPath);

    console.log(images);
    qaqcObj.images = images;

    qaqcObj._id = id;
    qaqcObj.updater = req.userData.userId;

    // if any field is blank, dont update it
    for (const [key, value] of Object.entries(qaqcObj)) {
      if (!value || value === "undefined") {
        delete qaqcObj[key];
        console.log(`${key}: ${value} deleted`);
      }
    }

    const qaqc = new Qaqc(qaqcObj);

    Qaqc.updateOne({ _id: id }, qaqc)
      .then(async (result) => {
        let nObj = await Qaqc.findById(id);
        await Mail.sendQaqc(nObj);
        // await Mail.sendQaqc(qaqc);
        if (result.n > 0) {
          return res.status(200).json({ message: "Update successful!", qaqc });
        } else {
          return res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch((error) => {
        return res.status(500).json({
          message: "Couldn't update qaqc! " + error,
        });
      });
  }
);

router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;
  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to delete ");
    return res.status(500).json({ message: "Not allowed" });
  }

  deleteQaqc();

  function deleteQaqc() {
    Qaqc.deleteOne({ _id: req.params.id })
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
          message: "Deleting qaqc failed! " + error,
        });
      });
  }
});

router.get("", checkAuth, async (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const userEmail = req.userData.email;
  const qaqcalloweds = process.env.QAQCALLOWEDS;
  if (!qaqcalloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to create Receipts");
    return res.status(500).json({ message: "Not allowed" });
  }

  // let qaqcQuery = Qaqc.find().sort({ createdAt: -1 }).limit(pageSize);
  let user = await User.find({ email: userEmail });

  if (MANAGERS.includes(userEmail)) {
    qaqcQuery = Qaqc.find().sort({ createdAt: -1 }).limit(pageSize);
  } else {
    qaqcQuery = Qaqc.find({ creator: user[0]._id })
      .sort({ createdAt: -1 })
      .limit(pageSize);
  }

  qaqcQuery
    .then((documents) => {
      res.status(200).json({
        message: "Qaqcs fetched successfully!",
        qaqc: documents,
      });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({
        message: "Fetching qa/qc failed! " + error,
      });
    });
});

router.get("/:id", (req, res, next) => {
  Qaqc.findById(req.params.id)
    .populate("creator")
    .then((qaqc) => {
      if (qaqc) {
        res.status(200).json({ qaqc });
      } else {
        res.status(404).json({ message: "qaqc not found!" });
      }
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({
        message: "Fetching qaqc failed! " + error,
      });
    });
});

router.put(
  "/notes/:id",
  checkAuth,
  Utils.upload3.any(),
  async function (req, res, next) {
    const alloweds = process.env.QAQCALLOWEDS;

    if (!alloweds.includes(req.userData.email)) {
      logIncident(req.userData.email, "Not allowed to create Receipts");
      return res.status(500).json({ message: "Not allowed" });
    }

    let updater = req.userData.userId;
    let myPath;
    if (req.files) {
      let fileName;
      req.files.forEach((file) => {
        if (file.originalname == "blob") {
          fileName =
            "uploads/qaqc/" + req.userData.userId + "/" + file.filename;
        } else {
          fileName =
            "uploads/qaqc/" + req.userData.userId + "/" + file.filename;
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
    await saveQaqc();

    async function saveQaqc() {
      try {
        if (myPath) {
          note.image = myPath;
        }

        let expObj = await Qaqc.findById(recId);

        // send mail with Note image
        await Mail.sendQaNote(note, expObj);

        let notes = expObj.notes ? expObj.notes : [];
        notes.push(note);
        log = expObj.log ? expObj.log : [];
        log.push({
          updater: note.author,
          status: expObj.status,
          date: new Date(),
          note,
        });
        Qaqc.findByIdAndUpdate(
          { _id: recId },
          { notes: notes, updater: updater, log: log }
        )
          .then((result) => {
            console.log("result ", result);
            res.status(201).json({
              message: " note with image updated successfully",
              qaqc: {
                ...result,
                id: result._id,
              },
            });
          })
          .catch((error) => {
            console.log(error);
            res.status(500).json({
              message: "Creating an Image upload failed! " + error,
            });
          });
      } catch (err) {
        console.log(err);
        res.status(500).json({
          message: "Error with update in try block " + err,
        });
      }
    }
  }
);

router.put("/action/:id", checkAuth, async function (req, res, next) {
  const alloweds = process.env.QAQCALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to create Receipts");
    return res.status(500).json({ message: "Not allowed" });
  }

  let updater = req.userData.userId;
  console.log(req.body, "reqbody");
  const { actionTaken, actionText } = req.body;

  let recId = req.params.id;
  await saveQaqc();

  async function saveQaqc() {
    try {
      Qaqc.findByIdAndUpdate(
        { _id: recId },
        { actionTaken, actionText, updater: updater }
      )
        .then(async (result) => {
          let nObj = await Qaqc.findById(recId);
          await Mail.sendQaqc(nObj);
          // console.log("result ", result);
          res.status(201).json({
            message: " action updated successfully",
            qaqc: {
              ...result,
              id: result._id,
            },
          });
        })
        .catch((error) => {
          console.log(error);
          res.status(500).json({
            message: "action update  failed! " + error,
          });
        });
    } catch (err) {
      console.log(err);
      res.status(500).json({
        message: "Error with update in try block " + err,
      });
    }
  }
});

module.exports = router;
