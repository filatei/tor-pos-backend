require("dotenv").config();
const express = require("express");
// const mongoose = require("mongoose");
// const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
// const homedir = os.homedir();
const { validationResult, check } = require("express-validator");
const Award = require("../models/award");
const router = express.Router();
const HttpError = require("../models/http-error");
const checkAuth = require("../middleware/check-auth");
const fileUpload = require("../middleware/file-upload");
const Recupload = require("../models/recupload");
const Utils = require("../utils");
// const { getHeapSnapshot } = require("v8");
// const { getDefaultSettings } = require("http2");
const moment = require("moment");
const dateFns = require("date-fns");

router.get("", async (req, res, next) => {
  let awards;
  try {
    awards = await Award.find().sort({ rank: 1 });
  } catch (err) {
    return res.status(500).json({
      message: "Fetching awards failed, please try again later." + err,
    });
  }
  res.json({ awards: awards });
});

router.get("/top20ForMonth", async (req, res, next) => {
  try {
    const { site, month, year, product, day, week } = req.query;
    let monthInt = parseInt(month);
    let yearInt = parseInt(year);
    let dayInt = parseInt(day);
    let weekInt = parseInt(week);
    weekInt = weekInt - 1;

    //weekly aggregation
    if (week && week !== "undefined") {
      console.log("week loop");
      const aggObject = {
        weekInt,
        yearInt,
        site,
        product,
      };

      const aggData = await Utils.weekAgg(aggObject);

      if (aggData) {
        console.log("week agg");
        return res.status(200).json({
          message: "top  sales for week",
          records: aggData,
        });
      }

      return res.status(500).json({ message: "aggregate error: " });
    }

    // Daily aggregation
    if (dayInt !== "undefined" && dayInt && typeof dayInt === "number") {
      console.log("day loop");
      const aggObject = {
        dayInt: dayInt,
        monthInt,
        yearInt,
        site,
        product,
      };

      const aggDay = await Utils.dayAgg(aggObject);
      // console.log(aggDay, "aggDay");

      if (aggDay) {
        return res.status(200).json({
          message: "top  sales for Day",
          records: aggDay,
        });
      }

      return res.status(500).json({ message: " Day aggregate error: " });
    }

    // month aggregation
    if (monthInt) {
      let aggObject = {
        monthInt,
        yearInt,
        site,
        product,
      };
      const aggMonth = await Utils.monthAgg(aggObject);
      if (aggMonth) {
        return res.status(200).json({
          message: "top  sales for Month",
          records: aggMonth,
        });
      }
      return res.status(500).json({ message: " Day aggregate error: " });
    }
  } catch (err) {
    return res.status(500).json({
      message: "Fetching records failed, please try again later." + err,
    });
  }
});

router.get("/:id", async (req, res, next) => {
  if (!req.params.id) {
    return;
  }
  const awardId = req.params.id;
  console.log(awardId, req.params);
  let award;
  try {
    award = await Award.findById(awardId);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Something went wrong, could not find a award." + err });
    // const error = new HttpError(
    //   "Something went wrong, could not find a award.",
    //   500
    // );
    // return next(error);
  }

  if (!award) {
    return res
      .status(400)
      .json({ message: "could not find a award for id." + awardId });
  }

  res.json({ award: award.toObject({ getters: true }) });
});

router.post(
  "",
  checkAuth,
  fileUpload.single("image"),
  [
    check("name").not().isEmpty(),
    check("qty").not().isEmpty(),
    check("year").not().isEmpty(),
    check("location").not().isEmpty(),
    check("rank").not().isEmpty(),
  ],
  async (req, res, next) => {
    const alloweds = process.env.DIRECTORS;

    if (!alloweds.includes(req.userData.email)) {
      Utils.logIncident(req.userData.email, "Not allowed to create Award");
      return res.status(500).json({ message: "Not allowed" });
    }
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({
        message:
          "Invalid inputs passed, please check your data." +
          JSON.stringify(errors),
      });
    }
    let filePath;
    let fileName;
    let url;
    if (req.file) {
      fileName = req.file.path;

      if (hostname.includes("torama.ng")) {
        let url = "https://api.torama.ng";
      } else {
        url = req.protocol + "://" + req.get("host");
      }
      filePath = url + "/" + fileName;
    }

    const {
      name,
      location,
      rank,
      year,
      prize,
      description,
      qty,
      category,
      remarks,
    } = req.body;

    if (!rank || !name || !qty || !location || !year) {
      // const error = new HttpError("Creating Award failed, blank Data.", 500);
      return res
        .status(500)
        .json({ message: "Creating Award failed, blank Data" });
    }

    const createdAward = new Award({
      name,
      rank: parseInt(rank.trim()),
      location,
      remarks,
      year,
      prize,
      description,
      qty: parseInt(qty.trim()),
      category,
      image: filePath,
      creator: req.userData.userId,
    });

    try {
      await createdAward.save();
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Creating Award failed, please try again" + err });
    }
    res
      .status(201)
      .json({ award: createdAward, message: "Award Added Successfully" });
  }
);

router.put(
  "/:id",
  checkAuth,
  fileUpload.single("image"),
  [
    check("name").not().isEmpty(),
    check("qty").not().isEmpty(),
    check("year").not().isEmpty(),
    check("location").not().isEmpty(),
    check("rank").not().isEmpty(),
  ],
  async (req, res, next) => {
    const alloweds = process.env.DIRECTORS;

    if (!alloweds.includes(req.userData.email)) {
      Utils.logIncident(req.userData.email, "Not allowed to update Awards");
      return res.status(500).json({ message: "Not allowed" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        message:
          "Invalid inputs passed, please check your data." +
          JSON.stringify(errors),
      });
    }
    // console.log("reqbody", req.body);
    let filePath;
    let url;

    if (req.file) {
      const fileName = req.file.path;

      if (hostname.includes("torama.ng")) {
        url = "https://api.torama.ng";
      } else {
        url = req.protocol + "://" + req.get("host");
      }
      filePath = url + "/" + fileName;
    }

    const newAward = { ...req.body };
    const awardId = req.params.id;
    let award;
    try {
      award = await Award.findById(awardId);
      console.log(award);
    } catch (err) {
      return res.status(500).json({
        message: "Something went wrong, could not find award." + err,
      });
    }

    if (award && award.creator.toString() !== req.userData.userId) {
      const error = new HttpError(
        "You are not allowed to edit this place.",
        401
      );
      return next(error);
    }

    award.name = newAward.name;
    award.rank = newAward.rank;
    award.category = newAward.category;
    award.location = newAward.location;
    award.year = newAward.year;
    award.qty = newAward.qty;
    award.prize = newAward.prize;
    award.remarks = newAward.remarks;
    if (filePath) {
      award.image = filePath;
    }

    console.log(award, "again");

    try {
      const saveRes = await award.save();
      res.status(200).json({
        award: award,
        message: "award updated successfully: " + saveRes,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Could not update award - " + err });
    }
  }
);

router.put(
  "/images/:id",
  checkAuth,
  fileUpload.any(""),
  async (req, res, next) => {
    const alloweds = process.env.MANAGERS;

    if (!alloweds.includes(req.userData.email)) {
      Utils.logIncident(req.userData.email, "Not allowed to update Awards");
      return res.status(500).json({ message: "Not allowed" });
    }

    const awardId = req.params.id;
    let award;
    try {
      award = await Award.findById(awardId);
      console.log(award);
    } catch (err) {
      return res.status(500).json({
        message: "Something went wrong, could not find award." + err,
      });
    }

    let filePath;
    let url;
    if (req.files) {
      req.files.forEach((file) => {
        const fileName = file.filename;
        if (hostname.includes("torama.ng")) {
          url = "https://api.torama.ng";
        } else {
          url = req.protocol + "://" + req.get("host");
        }
        filePath = url + "/uploads/awards/" + fileName;

        if (award && award.images && typeof award.images === "object") {
          award.images.push({
            imageId: new Date().getTime(),
            imagePath: filePath,
            description: req.body.description,
          });
        } else {
          award.images = [];
          award.images.push({
            imageId: new Date().getTime(),
            imagePath: filePath,
            description: req.body.description,
          });
        }
      });
    }

    try {
      const saveRes = await award.save();
      res.status(200).json({
        award: award,
        message: "award updated successfully: " + saveRes,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Could not update award - " + err });
    }
  }
);

router.delete("/:id", async (req, res, next) => {
  const alloweds = ["filatei@torama.ng"];
  if (!alloweds.includes(req.userData.email)) {
    return res.status(500).json({ message: "Not allowed" });
  }

  Award.deleteOne({ _id: req.params.id })
    .then((result) => {
      if (result.n > 0) {
        res.status(200).json({ message: "Deletion successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Deleting award failed! " + error,
      });
    });
});

module.exports = router;
