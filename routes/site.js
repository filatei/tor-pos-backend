const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/user");
const Utils = require("../utils");
const { validationResult } = require("express-validator");

const Site = require("../models/site");
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
        fileName = "uploads/site/" + req.userData.userId + "/" + file.filename;
        if (hostname.includes("torama.ng")) {
          url = "https://fido-api.torama.ng";
        } else {
          url = req.protocol + "://" + req.get("host");
        }

        myPath = url + "/" + fileName;
      }
      let taxR = 0;
      const { name, address, taxRate, buildDate, phone, email } = req.body;
      if (taxRate) {
        taxR = taxRate;
      }
      const creator = req.userData.userId;
      const siteObj = {
        name,
        address,
        taxRate: taxR,
        phone,
        buildDate,
        email,
        creator,
        image: myPath,
      };

      const site = new Site(siteObj);

      site
        .save()
        .then(async (result) => {
          //   const mailStat = await Mail.sendSite(result, req.userData);
          res.status(201).json({
            message: "Site added successfully",
            site: { ...result, id: result._id },
          });
        })
        .catch((error) => {
          res.status(500).json({
            message: "Creating a site failed! " + error,
          });
        });
    } catch (err) {
      res.status(500).json({
        message: "Creating a site failed! " + err,
      });
    }
  }
);

router.put("/:id", checkAuth, async (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;
  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to create Inventory");
    return res.status(500).json({ message: "Not allowed to create inventory" });
  }

  let siteObj = req.body;
  const id = req.params.id;
  
  let user = req.userData;
  const updater = req.userData.userId;

  const { name, phone, address, buildDate, email, taxRate } = req.body;
  siteObj = {
    name,
    phone,
    email,
    address,
    buildDate,
    taxRate,
    updater,
  };
  siteObj._id = id;
  let mailStat;


  Site.updateOne({ _id: id }, siteObj)
    .then(async (result) => {
      if (result.n > 0) {
        const updated = Site.findById(id);

        res.status(200).json({ message: "Update successful!", site: result });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Couldn't update site! " + error,
      });
    });
});

router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;
  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to delete ");
    return res.status(500).json({ message: "Not allowed" });
  }

  deleteSite();

  function deleteSite() {
    Site.deleteOne({ _id: req.params.id })
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
          message: "Deleting site failed! " + error,
        });
      });
  }
});

router.get("", checkAuth, async (req, res, next) => {
  const pageSize = +req.query.pagesize;
  if (!pageSize) pageSize = 200;
  const currentPage = +req.query.page;
  const directors = process.env.DIRECTORS;
  try {
    const site = await Site.find()
      .sort({ createdAt: -1, name: 1 })
      .limit(pageSize);
    return res.status(200).json({ site });
  } catch (err) {
    return res.status(500).json({
      message: "Fetching Sites failed, please try again later." + err,
    });
  }
});

router.get("/:id", async (req, res, next) => {
  console.log(req.params.id);
  Site.findById(req.params.id)
    .populate("creator")
    .then((site) => {
      if (site) {
        res.status(200).json({ site });
      } else {
        res.status(404).json({ message: "site not found!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching site failed! " + error,
      });
    });
});

module.exports = router;
