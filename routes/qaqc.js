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

router.post("", checkAuth, Utils.upload2.any(), async (req, res, next) => {
  const alloweds = process.env.QAQCALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to create Inventory");
    return res.status(500).json({ message: "Not allowed to create inventory" });
  }

  let qaqcObj = req.body;
  console.log(req.body);
  qaqcObj.alarm = false;
  if (parseInt(qaqcObj.observationScale) < parseInt(qaqcObj.refRangescale)) {
    qaqcObj.alarm = true;
  }

  qaqcObj.creator = req.userData.userId;
  qaqcObj.status = "DRAFT";

  const qaqc = new Qaqc(qaqcObj);

  qaqc
    .save()
    .then((result) => {
      res.status(201).json({
        message: "QA Report added successfully",
        qaqc: { ...result, id: result._id },
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Creating a QA report failed! " + error,
      });
    });
});

router.put(
  "/:id",
  checkAuth,
  Utils.upload3.single("image"),
  async (req, res, next) => {
    const alloweds = process.env.QAQCALLOWEDS;
    if (!alloweds.includes(req.userData.email)) {
      logIncident(req.userData.email, "Not allowed to create Inventory");
      return res
        .status(500)
        .json({ message: "Not allowed to create inventory" });
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
    const qaObj = await Qaqc.findById(id);
    const images = qaObj.images;
    if (myPath) images.push(myPath);
    // if (!qaqcObj.images || typeof qaqcObj.images !== "object") {
    //   qaqcObj.images = [];
    // }
    console.log(images);
    qaqcObj.images = images;

    let mailStat;

    async function isOpen() {
      if (
        status === "OPEN" ||
        status === "APPROVED" ||
        status === "REVIEWED" ||
        status === "DECLINED"
      ) {
        //  send mail
        mailStat = await Mail.sendQaqc(qaqcObj);
      }
    }

    const sendStat = await isOpen();

    qaqcObj._id = id;
    qaqcObj.updater = req.userData.userId;
    const qaqc = new Qaqc(qaqcObj);

    Qaqc.updateOne({ _id: id }, qaqc)
      .then((result) => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!", qaqc });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch((error) => {
        res.status(500).json({
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

  let qaqcQuery = Qaqc.find().sort({ createdAt: -1 });

  qaqcQuery
    .then((documents) => {
      res.status(200).json({
        message: "Qaqcs fetched successfully!",
        qaqc: documents,
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching inventories failed! " + error,
      });
    });
});

router.get("/qaqc/:id", (req, res, next) => {
  const expId = req.params.id;
  Qaqc.find({ qaqc_id: expId })
    .populate("creator")
    .then((qaqc) => {
      if (qaqc) {
        res.status(200).json({ qaqc });
      } else {
        const error = new HttpError("qaqc not found!", 404);
        return next(error);
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching qaqc failed! " + error,
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
      res.status(500).json({
        message: "Fetching qaqc failed! " + error,
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
            "uploads/qaqcs/" + req.userData.userId + "/" + file.filename;
        } else {
          fileName =
            "uploads/qaqcs/" + req.userData.userId + "/" + file.filename;
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
        await Mail.sendNote(note, expObj);

        let notes = expObj.notes;
        notes.push(note);
        log = expObj.log;
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
            res.status(201).json({
              message: " note with image updated successfully",
              qaqc: {
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
  let qaqcObj = req.body;
  qaqcObj.creator = req.userData.userId;
});

module.exports = router;
