const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/user");
const Site = require("../models/site");
const Utils = require("../utils");
const { validationResult } = require("express-validator");

const DailyReport = require("../models/dailyreport");
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
  Utils.upload5.single("image"),
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
          "uploads/dailyreports/" + req.userData.userId + "/" + file.filename;
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
        reportType,
        production,
        site,
        machine,
        people,
        fuel,
        roreadings,
        incidents,
        qualityreadings,
      } = req.body;
      const prod = JSON.parse(production);
      const roreads = JSON.parse(roreadings);
      const qualreads = JSON.parse(qualityreadings);
      const creator = req.userData.userId;
      const dailyReportObj = {
        status: "NOT SEEN",
        reportType,
        production: prod,
        machine,
        site,
        people,
        incidents,
        fuel,
        roreadings: roreads,
        qualityreadings: qualreads,
        creator,
        image: myPath,
      };
      console.log(dailyReportObj);
      const dailyreport = new DailyReport(dailyReportObj);

      dailyreport
        .save()
        .then(async (result) => {
          console.log(result, " result ");
          //   const mailStat = await Mail.sendDailyreport(result, req.userData);
          res.status(201).json({
            message: "Dailyreport added successfully",
            dailyreport: { ...result, id: result._id },
          });
        })
        .catch((error) => {
          res.status(500).json({
            message: "Creating a dailyreport failed! " + error,
          });
        });
    } catch (err) {
      res.status(500).json({
        message: "Creating a dailyreport failed! " + err,
      });
    }
  }
);

router.put("/:id", checkAuth, async (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;
  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to create Daily Report");
    return res
      .status(500)
      .json({ message: "Not allowed to create Daily Report" });
  }

  let dailyreportObj = req.body;
  const id = req.params.id;

  let user = req.userData;
  const updater = req.userData.userId;

  const {
    status,
    people,
    diesel,
    roreadings,
    incidents,
    qualityreadings,
    type,
    site,
  } = req.body;

  dailyreportObj = {
    status,
    people,
    roreadings,
    incidents,
    qualityreadings,
    diesel,
    type,
    site,
    updater,
  };
  dailyreportObj._id = id;
  let mailStat;

  DailyReport.updateOne({ _id: id }, dailyreportObj)
    .then(async (result) => {
      if (result.n > 0) {
        const updated = DailyReport.findById(id);
        // mailStat = await Mail.sendDailyreport(updated, user);

        res
          .status(200)
          .json({ message: "Update successful!", dailyreport: result });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Couldn't update dailyreport! " + error,
      });
    });
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
      .json({ message: "Not allowed to update Daily Report status" });
  }

  try {
    const updater = req.userData.userId;
    const { status } = req.body;
    if (!status.trim()) {
      return res.status(500).json({
        message: "empty status ",
      });
    }
    let mailStat;
    const user = req.userData;

    // mailStat = await Mail.sendDailyreport(dailyreportObj, user);
    DailyReport.updateOne({ _id: req.params.id }, { status: status, updater })
      .then((result) => {
        if (result.n > 0) {
          res
            .status(200)
            .json({ message: "Update successful!", dailyreport: result });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch((error) => {
        res.status(500).json({
          message: "Couldn't update dailyreport! " + error,
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

  deleteDailyreport();

  function deleteDailyreport() {
    DailyReport.deleteOne({ _id: req.params.id })
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
          message: "Deleting dailyreport failed! " + error,
        });
      });
  }
});

router.get("", checkAuth, async (req, res, next) => {
  let pageSize = +req.query.pagesize;
  if (!pageSize) pageSize = 200;
  const currentPage = +req.query.page;
  const directors = process.env.DIRECTORS;
  try {
    dailyreport = await DailyReport.find()
      .populate("creator")
      .sort({ createdAt: -1 })
      .limit(pageSize);
  } catch (err) {
    return res.status(500).json({
      message: "Fetching Daily Report failed, please try again later." + err,
    });
  }
  res.status(200).json({ dailyreport });
});

router.get("/:id", async (req, res, next) => {
  console.log(req.params.id);
  DailyReport.findById(req.params.id)
    .populate("creator")
    .then((dailyreport) => {
      if (dailyreport) {
        res.status(200).json({ dailyreport });
      } else {
        res.status(404).json({ message: "dailyreport not found!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching dailyreport failed! " + error,
      });
    });
});

module.exports = router;
