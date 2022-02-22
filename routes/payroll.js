const express = require("express");
const mongoose = require("mongoose");

const Payroll = require("../models/payroll");
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
const DIR = "./uploads/payrollimages/";
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
          url = "https://api.torama.ng";
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
    let pay = new Payroll(dObj);
    const saved = await pay.save();
    
    if (saved) {
      console.log(saved)
      return res.status(201).json({
        message: "payroll Uploaded successfully",
        
      });
    } else {
      return res.status(500).json({
        message: "Creating a Payroll failed!"
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
  let payrollObj = req.body;

  const id = req.params.id;
  payrollObj._id = id;
  payrollObj.updater = req.userData.userId;
  if (payrollObj.image === 'null') {
    delete payrollObj.image; // dont update image if not sent
 }
  const payroll = new Payroll(payrollObj);
  
  console.log(payroll, 'distr object');

  if (req.files) {
    req.files.forEach((file) => {
      if (hostname.includes("torama.ng")) {
        url = "https://api.torama.ng";
      } else {
        url = req.protocol + "://" + req.get("host");
      }
        const fPath = url + "/" + file.path;
      payroll.image = fPath;
      console.log(fPath)
    });
  }

  Payroll.updateOne({ _id: req.params.id }, payroll)
  .then((result) => {
    if (result.n > 0) {
      res.status(200).json({ message: "Update successful!" });
    } else {
      res.status(401).json({ message: "Not authorized!" });
    }
  })
  .catch((error) => {
    res.status(500).json({
      message: "Couldn't update payroll! " + error,
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
            url = "https://api.torama.ng";
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

      const oldPayroll = await Payroll.findById(recId).lean();
      if (!oldPayroll) {
        return   res.status(500).json({ message: "No record to update! "  })
      }
      if (!oldPayroll?.notes?.length) {
        oldPayroll.notes = [];
      }
      const notes = [...oldPayroll.notes, note];
      const payroll = new Payroll({ notes: notes });
      payroll._id = recId;
      payroll.updater = req.userData.userId;
      // payroll.notes = [...notes];

      console.log(payroll)
      const updated = await Payroll.updateOne({ _id: req.params.id }, payroll)

      // payroll.save();
      
      if (updated) {
        return res.status(200).json({ message: "Update successful! "  });
      } else {
        return res.status(500).json({ message: "Couldn't update Payroll! " + JSON.stringify(inserted) })
      }
    } catch (error) {
      console.log(error)
      res.status(500).json({ message: "try error: Couldn't update Payroll!" + error })
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
    Payroll.findById(id)
      .then((payroll) => {
        if (payroll && payroll.image) {
          filePath = "uploads/" + payroll.image.split("/uploads/")[1];
          console.log(filePath);
        }
      })
      .catch((err) => {
        return res
          .status(401)
          .json({ message: "payroll not found in db!" + err });
      });
    // console.log('params ', req.params)
    Payroll.deleteOne({ _id: req.params.id })
      .then((result) => {
        if (result.n > 0) {
          // delete payroll.image
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
          message: "Deleting payroll failed! " + error,
        });
      });
  } catch (error) {
    console.error(error, "catch err");
    return  res.status(500).json({
        message: "TryCatch: Deleting payroll failed! " + error,
      });
  }
});

router.get("", (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const payrollQuery = Payroll.find().sort({name:1}).populate('linkedCustomer').populate('creator')
  if (pageSize && currentPage) {
    payrollQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  payrollQuery
    .then((documents) => {
      res.status(200).json({
        message: "payrolls fetched successfully!",
        payrolls: documents,
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching payrolls failed! " + error,
      });
    });
});

router.get("/:id", (req, res, next) => {
  Payroll.findById(req.params.id).populate('linkedCustomer').populate('creator')
    .then((payroll) => {
        if (payroll) {
            res.status(200).json({ payroll:payroll });
      } else {
        res.status(404).json({ message: "payroll not found!" });
      }
    })
      .catch((error) => {
        console.log(error)
      res.status(500).json({
        message: "Fetching payroll failed! " + error,
      });
    });
});

module.exports = router;
