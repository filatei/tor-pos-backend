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
const Utils = require("../utils");
const { getHeapSnapshot } = require("v8");
const { getDefaultSettings } = require("http2");

router.get("", async (req, res, next) => {
  let awards;
  try {
    awards = await Award.find();
  } catch (err) {
    return res.status(500).json({
      message: "Fetching awards failed, please try again later." + err,
    });
    // const error = new HttpError(
    //   "Fetching awards failed, please try again later.",
    //   500
    // );
    // return next(error);
  }
  res.json({ awards: awards });
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

    // const error = new HttpError(
    //   "Could not find award for the provided id.",
    //   404
    // );
    // return next(error);
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
      Utils.logIncident(req.userData.email, "Not allowed to create Receipts");
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
    if (req.file) {
      fileName = req.file.path;

      if (hostname.includes("torama.ng")) {
        url = "https://api.torama.ng";
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
      const error = new HttpError(
        "Creating Award failed, please try again." + err,
        500
      );
      return next(error);
    }
    res
      .status(201)
      .json({ award: createdAward, message: "Award Added Successfully" });
  }
);

router.put("/:id", checkAuth, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { rank, location, year, qty } = req.body;
  const awardId = req.params.id;

  let award;
  try {
    award = await Award.findById(awardId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );
    return next(error);
  }

  if (award.creator.toString() !== req.userData.userId) {
    const error = new HttpError("You are not allowed to edit this place.", 401);
    return next(error);
  }

  award.rank = rank;
  place.location = location;
  award.year = year;
  award.qty = qty;

  try {
    await award.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );
    return next(error);
  }

  res.status(200).json({ award: award.toObject({ getters: true }) });
});

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
