require("dotenv").config();
const express = require("express");
const Award = require("../models/award");
const router = express.Router();
const HttpError = require("../models/http-error");
const checkAuth = require("../middleware/check-auth");

router.get("", async (req, res, next) => {
  let awards;
  try {
    awards = await Award.find({});
  } catch (err) {
    const error = new HttpError(
      "Fetching awards failed, please try again later.",
      500
    );
    return next(error);
  }
  res.json({
    awards: awards.map((award) => award.toObject({ getters: true })),
  });
});

router.get("/:id", (req, res, next) => {
    const awardId = req.params.pid;

    let award;
    try {
      award = await Award.findById(awardId);
    } catch (err) {
      const error = new HttpError(
        'Something went wrong, could not find a place.',
        500
      );
      return next(error);
    }
  
    if (!award) {
      const error = new HttpError(
        'Could not find place for the provided id.',
        404
      );
      return next(error);
    }
  
    res.json({ award: award.toObject({ getters: true }) });
});

router.post("", checkAuth, async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        new HttpError('Invalid inputs passed, please check your data.', 422)
      );
    }
  
    const { customer, location, position, year, prize } = req.body;
  
    // let coordinates;
    // try {
    //   coordinates = await getCoordsForAddress(address);
    // } catch (error) {
    //   return next(error);
    // }
  
    const createdAward = new Award({
      customer,
      position,
        location,
      year,
      prize,
      image: req.file.path,
      creator: req.userData.userId
    });
  
    
  
    try {
      const sess = await mongoose.startSession();
      sess.startTransaction();
      await createdAward.save({ session: sess });
      await sess.commitTransaction();
    } catch (err) {
      const error = new HttpError(
        'Creating place failed, please try again.',
        500
      );
      return next(error);
    }
    res.status(201).json({ award: createdAward });
});

router.put("/:id", checkAuth, async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        new HttpError('Invalid inputs passed, please check your data.', 422)
      );
    }
  
    const { position, location, year } = req.body;
    const awardId = req.params.pid;
  
    let award;
    try {
      award = await Award.findById(awardId);
    } catch (err) {
      const error = new HttpError(
        'Something went wrong, could not update place.',
        500
      );
      return next(error);
    }
  
    if (award.creator.toString() !== req.userData.userId) {
      const error = new HttpError('You are not allowed to edit this place.', 401);
      return next(error);
    }
  
    award.position = position;
    place.location = location;
    award.year = year
  
    try {
      await place.save();
    } catch (err) {
      const error = new HttpError(
        'Something went wrong, could not update place.',
        500
      );
      return next(error);
    }
  
    res.status(200).json({ award: award.toObject({ getters: true }) });
});

router.delete("/:id",  async (req, res, next) => {
  const alloweds = ["filatei@torama.ng"];
  if (!alloweds.includes(req.userData.email)) {
    return res.status(500).json({ message: "Not allowed" });
  }

  Award.deleteOne({ _id: req.params.id })
    .then((result) => {
      // console.log(result);
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

router.post("/import", checkAuth, (req, res, next) => {
  const alloweds = ["filatei@torama.ng"];
  if (!alloweds.includes(req.userData.email)) {
    return res.status(500).json({ message: "Not allowed" });
  }
  // exports.importClaim =  (req, res, next) => {
  // console.log(req)
  let customerArr = req.body; // array of award objs
  // zawsw console.log('claimObj ',req)
  // userData was added to checkAuth middleware and passed along
  // console.log('userdata in claim ', req.userData)

  // unique award names
  function uniqcust(array) {
    const key = "name";
    const arrayUniqueByKey = [
      ...new Map(array.map((item) => [item[key], item])).values(),
    ];

    return arrayUniqueByKey;
  }

  let uniqcusts = uniqcust(customerArr);
  Award.collection
    .insertMany(uniqcusts, { ordered: true })
    .then((result) => {
      // console.log('insertcount', result.insertedCount)
      res
        .status(200)
        .json({ message: "customers insertered " + result.insertedCount });
    })
    .catch((err) => {
      // console.error(err)
      res.status(500).json({
        message: "Creating  customers failed!" + err,
      });

      throw err;
    });
});

module.exports = router;
