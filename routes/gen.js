require("dotenv").config();
const express = require("express");
const Gen = require("../models/gen");
const router = express.Router();
const moment = require("moment");

const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
const homedir = os.homedir();
const tokens = require(`${homedir}/.token.json`);
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const _ = require("lodash");
const User = require("../models/user");

const mime = require("mime");
const Accesslog = require("../models/accesslog");
var sanitize = require("mongo-sanitize");

const env = process.env.NODE_ENV || "development";

const Utils = require("../utils");
const Mail = require("../mail");
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
const mail = require("../models/mail");
const { isBoolean } = require("lodash");
const e = require("express");

router.post("", checkAuth, Utils.upload.any(), async (req, res, next) => {
    const alloweds = process.env.GENERALMANAGERS;
  
    if (!alloweds.includes(req.userData.email)) {
      logIncident(req.userData.email, "Not allowed to create Geb");
      return res.status(500).json({ message: "Not allowed" });
    }
    let gObj = req.body;
   
    gObj.creator = req.userData.userId;

    if (gObj.current_hour) {
        const thisHourHist = {
            hour: gObj.current_hour,
            date: new Date(),
            author: req.userData.userId
        }
        gObj.hour_history = [thisHourHist]
    }
    
    if (req.files) {
      req.files.forEach((file) => {
        if (hostname.includes("torama.ng")) {
          url = "https://api.torama.ng";
        } else {
          url = req.protocol + "://" + req.get("host");
        }
        const fPath = url + "/" + file.path;
        gObj.image = fPath;
      });
    }
    Object.entries(gObj).forEach(([key, value]) => {
      if (
        !value ||
        value === undefined ||
        value === null ||
        value === "null" ||
        value === "undefined"
      ) {
        delete gObj[key];
      }
    });
  
   saveGen(gObj)
  
    function saveGen(genobj) {
      gen = new Gen(genobj);
      gen
        .save()
        .then((result) => {
          res.status(201).json({
            message: "Gen  Uploaded successfully",
            Recupload: {
              ...result,
              id: result._id,
            },
          });
        })
        .catch((error) => {
          res.status(500).json({
            message: "Creating a Gen failed! " + error,
          });
        });
    }
  });

router.delete("/:id", checkAuth, async (req, res, next) => {
    if (!req.params.id) return res.status(401).json({ error: "empty id" });
    const alloweds = process.env.DELALLOWEDS;

    if (!alloweds.includes(req.userData.email)) {
        logIncident(req.userData.email, "Not allowed to delete Gen");
        return res.status(500).json({ message: "Not allowed" });
    }

    let filePath;
    try {
        const deleted = await Gen.deleteOne(req.params.id);
        if (deleted) {
            return res.status(200).json({message: 'deleted Gen record'});
        } else {
            return res.status(401).json({message: 'Error deleting Gen record'});
        }
    } catch (err) {
        throw err
        // return res.status(401).json({message: 'Error deleting Gen record ' + err});
    }
    
});

router.get("", checkAuth, async (req, res, next) => {
    const alloweds = process.env.ALLOWEDS;
  
    if (!alloweds.includes(req.userData.email)) {
      logIncident(req.userData.email, "Not allowed to see Gens");
      return res.status(500).json({ message: "Not allowed" });
    }
  
    const pageSize = +req.query.pagesize;
    const currentPage = +req.query.page;
    const site = req.query.site;
    const idate = req.query.idate;
    const today = moment().startOf("day");
    let coyQuery;
  
    // condition for today results
    let cond1 = {
      createdAt: {
        $gte: today.toDate(),
        $lte: moment(today).endOf("day").toDate(),
      },
    };
    coyQuery = Gen.find()
      .sort({ createdAt: -1 })
      .populate("site")
      .populate("creator")

      .populate("updater");
    if (pageSize && currentPage) {
      coyQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
    }
    coyQuery
      .then((documents) => {
        res.status(200).json({
            message: "records fetched successfully!",
            records: documents,
          });
      })
     
      .catch((error) => {
        res.status(500).json({
          message: "Fetching records failed! " + error,
        });
      });
  });

router.get("/:id", checkAuth, (req, res, next) => {
const alloweds = process.env.ALLOWEDS;

if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to see Gens");
    return res.status(500).json({ message: "Not allowed" });
}
Gen.findById(req.params.id)
    .populate("site")
    .populate("creator")
    .populate("updater")
    .then((record) => {
    if (record) {
        return res.status(200).json({record: record});
    } else {
        return res.status(404).json({ message: "record not found!" });
    }
    })
    .catch((error) => {
    return res.status(500).json({
        message: "Fetching record failed!" + error,
    });
    });
});

  router.put("/:id", checkAuth, async (req, res, next) => {
    const alloweds = process.env.ALLOWEDS;
    if (!alloweds.includes(req.userData.email)) {
      logIncident(req.userData.email, "Not allowed to update Gens");
      return res.status(500).json({ message: "Not allowed" });
    }

    let recObj = req.body;
  
    recObj._id = sanitize(req.params.id);

    // access control
    let user = await User.findById(req.userData.userId).lean();
  
    recObj.updater = req.userData.userId;
    const gen = new Gen(recObj);

    const oldGen = await Gen.findById(req.params.id).lean();
    let updated;
    if ( gen.note.text ) {

        const thisNote = {...gen.note, author: req.userData.name}
        gen.note = {...thisNote};
        if ( oldGen.notes.length ) {
            gen.notes = [thisNote, ...oldGen.notes ]
        } else {
            gen.notes = [thisNote]
        }
        updated = await Gen.updateOne({ _id: req.params.id }, { $set: {note: gen.note, notes: gen.notes }});
    } else if ( gen.current_hour.hour) {
        const thisHourHist = {...gen.current_hour, author: req.userData.name}
        gen.current_hour = {...thisHourHist}
    
        if ( oldGen.hour_history.length ) {
            gen.hour_history = [thisHourHist, ...oldGen.hour_history, ]
        } else {
            gen.hour_history = [thisHourHist]
        }
        updated = await Gen.updateOne({ _id: req.params.id }, { $set: {current_hour: gen.current_hour, hour_history: gen.hour_history }});
    } else if ( gen.current_maintenance.maintenance_hour ) {

        const thisMaintHist = {...gen.current_maintenance, author: req.userData.name}
        gen.current_maintenance = {...thisMaintHist}
        gen.current_hour = { hour: gen.current_maintenance.maintenance_hour, date: gen.current_maintenance.date, author: req.userData.name };
        gen.hour_history = [gen.current_hour, ...oldGen.hour_history]

        if ( oldGen.maintenance_history.length ) {
            gen.maintenance_history = [thisMaintHist, ...oldGen.maintenance_history, ]
        } else {
            gen.maintenance_history = [thisMaintHist]
        }
        updated = await Gen.updateOne({ _id: req.params.id }, { $set: {current_maintenance: gen.current_maintenance, maintenance_history: gen.maintenance_history, current_hour: gen.current_hour, hour_history: gen.hour_history }});
    } else {

        updated = await Gen.updateOne({ _id: req.params.id }, { $set: {purchase_price: gen.purchase_price, purchase_date: gen.purchase_date, sn: gen.sn, kva: gen.kva, model: gen.model, brand: gen.brand }});

    }

    if ( updated?.nModified && updated?.ok ) {
        console.log('updated', updated)
        return res.status(200).json({ message: "Update successful! " + JSON.stringify(updated) });
    } else {
        res.status(500).json({ message: "Couldn't update Gen!" })
    }

  });

  module.exports = router;

