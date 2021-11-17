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
const GenNotes = require('../models/gen-notes');
const GenDiesel = require('../models/gen-diesel');
const GenMaint = require('../models/gen-maint');

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

    try {
      const gQuery = await Gen.find().lean()
      .populate({path: "site", select: 'name'})
      .populate("creator", ['name', 'email'])
      .populate("updater", ['name', 'email']);
      if (gQuery?.length) {
        const gen = await _.orderBy(gQuery, "site.name", 'asc');
        return res.status(200).json({
          message: "records fetched successfully!",
          records: gen,
        });
      } else {
        return res.status(500).json({
          message: "Fetching records failed! " ,
        });
      }

    } catch (err) {
      res.status(500).json({
        message: "Fetching records failed! " + err ,
      });
    }
  });

router.get("/:id", checkAuth, async (req, res, next) => {
const alloweds = process.env.ALLOWEDS;

if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to see Gens");
    return res.status(500).json({ message: "Not allowed" });
}
const recId = req.params.id;
const notes = await GenNotes.find({gen:recId});
const maintenance_history = await GenMaint.find({gen:recId});
const diesel_history = await GenDiesel.find({gen:recId});

Gen.findById(recId)
  .populate("site", 'name')
  .populate("creator", 'name')
  .populate("updater", 'name')
  .then((record) => {
    if (record) {
        record.notes = [...notes, ...record.notes];
        record.maintenance_history = [...maintenance_history, ...record.maintenance_history];
        record.diesel_history = [...diesel_history, ...record.diesel_history];
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
  
    recObj.updater = req.userData.userId;
    // let gen = new Gen();
    let gen = {...req.body}

    const oldGen = await Gen.findById(req.params.id).lean().populate('site', 'name');
    let updated, inserted;
    const author = req.userData.name==='Akpodigha Filatei'?'MD':req.userData.name;
    

    if ( gen.current_diesel && gen.current_diesel.diesel_litres) {
        const thisDieselHist = {...gen.current_diesel, author: author, gen:oldGen._id}
        gen.current_diesel = {...thisDieselHist}

        // record current hour also
        gen.current_hour = { hour: gen.current_diesel.diesel_hours, date: gen.current_diesel.date, author: author };
        gen.hour_history = [gen.current_hour, ...oldGen.hour_history]
       
        const mGen = {current_diesel:gen.current_diesel,  name: oldGen.name, site: oldGen.site};

        const mailed = await Mail.sendGenActivity(mGen, req.userData);
        
        const genDiesel= new GenDiesel(thisDieselHist)
        inserted = await genDiesel.save();

        updated = await Gen.updateOne({ _id: req.params.id }, { $set: { current_hour: gen.current_hour, hour_history: gen.hour_history }});
    } 
    
     else {
        updated = await Gen.updateOne({ _id: req.params.id }, { $set: {purchase_price: gen.purchase_price, purchase_date: gen.purchase_date, sn: gen.sn, kva: gen.kva, model: gen.model, brand: gen.brand, description: gen.description, site: gen.site }});
    }

    if ( updated?.nModified && updated?.ok ) {
      
      return res.status(200).json({ message: "Update successful! " + JSON.stringify(updated) });
    } else {
        res.status(500).json({ message: "Couldn't update Gen!" })
    }

  });

  router.put(
    "/maintenance/:id",
    checkAuth,
    Utils.upload8.any(),
    async function (req, res, next) {

      const alloweds = process.env.ALLOWEDS;
      if (!alloweds.includes(req.userData.email)) {
        logIncident(req.userData.email, "Not allowed to create notes");
        return res.status(500).json({ message: "Not allowed" });
      }
      const current_maintenance = JSON.parse(req.body.current_maintenance); 

      if ( !current_maintenance?.maintenance_hour ) {
        return res.status(500).json({
          message: "Error: Maintenance Hour Required",
        });
      }
      let recId = req.params.id;
      let author = req.userData.name==='Akpodigha Filatei'?'MD':req.userData.name;
      current_maintenance.author = author;

      let myPath;
      if (req.files) {
        req.files.forEach((file) => {
          if (hostname.includes("torama.ng")) {
            url = "https://api.torama.ng";
          } else {
            url = req.protocol + "://" + req.get("host");
          }
          myPath = url + "/" + file.path;
        });
      }

      if ( myPath ) {
        current_maintenance.image = myPath;
      }
      const oldGen = await Gen.findById(recId).lean().populate('site','name');
      
      const gen = new Gen();
      gen.current_maintenance = current_maintenance;
      
      gen.current_hour = { hour: current_maintenance.maintenance_hour, date: current_maintenance.date, author: author };
      gen.hour_history = [gen.current_hour, ...oldGen.hour_history]

      current_maintenance.gen = oldGen._id;
      const genMaint = new GenMaint(current_maintenance);
      console.log(genMaint)
      inserted = await genMaint.save();

      updated = await Gen.updateOne({ _id: req.params.id }, { $set: { current_hour: gen.current_hour, hour_history: gen.hour_history }});

      if ( updated?.nModified && updated?.ok ) {
        const mGen = {...gen._doc, site:oldGen.site, name:oldGen.name};
        const mailed = Mail.sendGenActivity(mGen, req.userData);
        return res.status(200).json({ message: "Update successful! " + JSON.stringify(updated) });
      } else {
          res.status(500).json({ message: "Couldn't update Gen!" })
      }
    }
  );
  
  router.put(
    "/notes/:id",
    checkAuth,
    Utils.upload8.any(),
    async function (req, res, next) {
      const alloweds = process.env.ALLOWEDS;
      if (!alloweds.includes(req.userData.email)) {
        logIncident(req.userData.email, "Not allowed to create notes");
        return res.status(500).json({ message: "Not allowed" });
      }
      
      const note = JSON.parse(req.body.note); 

      if ( !note.text ) {
        return res.status(500).json({
          message: "Error:  notes text Required",
        });
      }
      let recId = req.params.id;
      const author = req.userData.name==='Akpodigha Filatei'?'MD':req.userData.name;

      note.author = author;

      let myPath;
      if (req.files) {
        req.files.forEach((file) => {
          if (hostname.includes("torama.ng")) {
            url = "https://api.torama.ng";
          } else {
            url = req.protocol + "://" + req.get("host");
          }
          myPath = url + "/" + file.path;
        });
      }

      if ( myPath ) {
        note.image = myPath;
      }

      const oldGen = await Gen.findById(recId).lean().populate('site', 'name');
      const gen = new Gen();
      gen.note = note;

      note.gen = oldGen._id;
      const genNotes = new GenNotes(note);
      inserted = await genNotes.save();

      // updated = await Gen.updateOne({ _id: req.params.id }, { $set: {note: gen.note, notes: gen.notes }});

      if ( inserted._id) {
        const mGen = {note, site:oldGen.site, name:oldGen.name};
        const mailed = Mail.sendGenActivity(mGen, req.userData);
        return res.status(200).json({ message: "Update successful! "  });
      } else {
          res.status(500).json({ message: "Couldn't update Gen!" })
      }
    }
  );

module.exports = router;

