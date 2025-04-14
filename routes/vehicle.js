const express = require("express");
const mongoose = require("mongoose");

const Vehicle = require("../models/vehicle");
const Accesslog = require("../models/accesslog");
const router = express.Router();
const Path = require("path");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
var multer = require("multer");

const MIME_TYPE_MAP = {
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/jpg": "jpg",
  };
const DIR = "./uploads/vehicleimages/";
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      userid = req.userData.userId;
      const myDir = DIR + userid + "/";
      try {
        if (!fs.existsSync(myDir)) {
          fs.mkdirSync(myDir, { recursive: true });
        }
      } catch (err) {
        throw err;
      }
      cb(null, myDir);
    },
    filename: (req, file, cb) => {
      const fileName =
        req.userData.userId +
        "-" +
        new Date().getTime() +
        file.originalname.toLowerCase().split(" ").join("-") +
        "." +
        MIME_TYPE_MAP[file.mimetype];
  
      cb(null, fileName);
    },
  });
  
  // Multer Mime Type Validation
  var upload = multer({
    storage: storage,
    limits: {
      fileSize: 1024 * 1024 * 10,
    },
    fileFilter: (req, file, cb) => {
      // console.log(file.mimetype)
      if (
        file.mimetype == "image/png" ||
        file.mimetype == "image/jpeg" ||
        file.mimetype == "image/jpg" 
      ) {
        cb(null, true);
      } else {
        cb(null, false);
        return cb(new Error("Only .png or .jpg format allowed!"));
      }
    },
  });
  

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

router.post("", checkAuth, upload.any(), async function (req, res, next) {
  try {
    const alloweds = process.env.ALLOWEDS;
  
    if (!alloweds.includes(req.userData.email)) {
      return res.status(500).json({ message: "Not allowed" });
    }
  
    let dObj = req.body;
   
    dObj.creator = req.userData.userId;
    
    if (req.files) {
      req.files.forEach((file) => {
        if (hostname.includes("torama.ng")) {
          url = "https://fido-api.torama.ng";
        } else {
          url = req.protocol + "://" + req.get("host");
        }
          const fPath = url + "/" + file.path;
        dObj.image = fPath;
      });
    }
  
    Object.entries(dObj).forEach(([key, value]) => {
      if (
        !value ||
        value === undefined ||
        value === null ||
        value === "null" ||
        value === "undefined"
      ) {
        delete dObj[key];
      }
    });

    console.log(dObj);
    let veh = new Vehicle(dObj);
    const saved = await veh.save();
    
    if (saved) {
      console.log(saved)
      return res.status(201).json({
        message: "vehicle Uploaded successfully",
        
      });
    } else {
      return res.status(500).json({
        message: "Creating a Vehicle failed!"
      });
    }
  
    // saveDist(dObj);
  
    
  } catch (error) {
    console.log(error)
    res.status(500).json({
      message: "Try error! " + error,
    });
    
  }

    
});

router.put("/:id", checkAuth, upload.any(), async (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;
  
  if (!alloweds.includes(req.userData.email)) {
    return res.status(500).json({ message: "Not allowed" });
  }
  let path = "";
  let url = "";
  let vehicleObj = req.body;

  const id = req.params.id;
  vehicleObj._id = id;
  vehicleObj.updater = req.userData.userId;
  if (vehicleObj.image === 'null') {
    delete vehicleObj.image; // dont update image if not sent
 }
  const vehicle = new Vehicle(vehicleObj);
  
  console.log(vehicle, 'distr object');

  if (req.files) {
    req.files.forEach((file) => {
      if (hostname.includes("torama.ng")) {
        url = "https://fido-api.torama.ng";
      } else {
        url = req.protocol + "://" + req.get("host");
      }
        const fPath = url + "/" + file.path;
      vehicle.image = fPath;
      console.log(fPath)
    });
  }

  Vehicle.updateOne({ _id: req.params.id }, vehicle)
  .then((result) => {
    if (result.n > 0) {
      res.status(200).json({ message: "Update successful!" });
    } else {
      res.status(401).json({ message: "Not authorized!" });
    }
  })
  .catch((error) => {
    res.status(500).json({
      message: "Couldn't update vehicle! " + error,
    });
  });
  
});

router.put(
  "/notes/:id", checkAuth, upload.any(), async function (req, res, next)  {
    console.log('here')
    try {
      const alloweds = process.env.ALLOWEDS;
      if (!alloweds.includes(req.userData.email)) {
        return res.status(500).json({ message: "Not allowed" });
      }
      console.log(req.body)
      
      const text = req.body.text;
      const date = req.body.date;

      console.log(text, date, 'text date')

      if ( !text ) {
        return res.status(500).json({
          message: "Error:  notes text Required",
        });
      }

      let recId = req.params.id;
      const author = req.userData.name==='Akpodigha Filatei'?'MD':req.userData.name;

      let myPath;
      if (req.files) {
        req.files.forEach((file) => {
          if (hostname.includes("torama.ng")) {
            url = "https://fido-api.torama.ng";
          } else {
            url = req.protocol + "://" + req.get("host");
          }
          myPath = url + "/" + file.path;
        });
      }

      const note = { text:text, date:date, author:author }

      if ( myPath ) {
        note.image = myPath;
      }

     



      const oldVehicle = await Vehicle.findById(recId).lean();
      if (!oldVehicle) {
        return   res.status(500).json({ message: "No record to update! "  })
      }
      if (!oldVehicle?.notes?.length) {
        oldVehicle.notes = [];
      }
      const notes = [...oldVehicle.notes, note];
      const vehicle = new Vehicle({ notes: notes });
      vehicle._id = recId;
      vehicle.updater = req.userData.userId;
      // vehicle.notes = [...notes];

      console.log(vehicle)
      const updated = await Vehicle.updateOne({ _id: req.params.id }, vehicle)

      // vehicle.save();
      
      if (updated) {
        return res.status(200).json({ message: "Update successful! "  });
      } else {
        return res.status(500).json({ message: "Couldn't update Vehicle! " + JSON.stringify(inserted) })
      }
    } catch (error) {
      console.log(error)
      res.status(500).json({ message: "try error: Couldn't update Vehicle!" + error })
    }
  }
);

router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to delete ");
    return res.status(500).json({ message: "Not allowed" });
  }
  const id = req.params.id;
  let filePath;


  try {
    Vehicle.findById(id)
      .then((vehicle) => {
        if (vehicle && vehicle.image) {
          filePath = "uploads/" + vehicle.image.split("/uploads/")[1];
          console.log(filePath);
        }
      })
      .catch((err) => {
        return res
          .status(401)
          .json({ message: "vehicle not found in db!" + err });
      });
    // console.log('params ', req.params)
    Vehicle.deleteOne({ _id: req.params.id })
      .then((result) => {
        if (result.n > 0) {
          // delete vehicle.image
          if (filePath) {
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(err, "file unlink err");
              } else {
                console.log("related file deleted");
              }
            });
          }
          res.status(200).json({ message: "Deletion successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch((error) => {
        console.error(error, "catch err");
        res.status(500).json({
          message: "Deleting vehicle failed! " + error,
        });
      });
  } catch (error) {
    console.error(error, "catch err");
    return  res.status(500).json({
        message: "TryCatch: Deleting vehicle failed! " + error,
      });
  }
});

router.get("", (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const vehicleQuery = Vehicle.find().sort({name:1}).populate('linkedCustomer').populate('creator')
  if (pageSize && currentPage) {
    vehicleQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  vehicleQuery
    .then((documents) => {
      res.status(200).json({
        message: "vehicles fetched successfully!",
        vehicles: documents,
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching vehicles failed! " + error,
      });
    });
});

router.get("/:id", (req, res, next) => {
  Vehicle.findById(req.params.id).populate('linkedCustomer').populate('creator')
    .then((vehicle) => {
        if (vehicle) {
            res.status(200).json({ vehicle:vehicle });
      } else {
        res.status(404).json({ message: "vehicle not found!" });
      }
    })
      .catch((error) => {
        console.log(error)
      res.status(500).json({
        message: "Fetching vehicle failed! " + error,
      });
    });
});

module.exports = router;
