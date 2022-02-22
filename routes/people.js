const express = require("express");
const mongoose = require("mongoose");

const People = require("../models/people");
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
  "text/csv": "csv",
  };
const DIR = "./uploads/peopleimages/";
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
        file.mimetype == "image/jpg" ||
        file.mimetype == "text/csv" 
        
      ) {
        cb(null, true);
      } else {
        cb(null, false);
        return cb(new Error("Only .png or .jpg or csv format allowed!"));
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
    //console.log(req.query)
    const { csvUpload } = req.query;
    if (csvUpload) {
      if (req.files) {
        req.files.forEach((file) => {
          if (hostname.includes("torama.ng")) {
            url = "https://api.torama.ng";
          } else {
            url = req.protocol + "://" + req.get("host");
          }
            const fPath = url + "/" + file.path;
          // dObj.image = fPath;
          console.log(fPath);
        });
      }
    
      return res.status(200).json({
        message: "csv Upload possible",
        
      });
      // run csv routine
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
    let ppl = new People(dObj);
    const saved = await ppl.save();
    
    if (saved) {
      console.log(saved)
      return res.status(201).json({
        message: "people Uploaded successfully",
        
      });
    } else {
      return res.status(500).json({
        message: "Creating a People failed!"
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
  let peopleObj = req.body;

  const id = req.params.id;
  peopleObj._id = id;
  peopleObj.updater = req.userData.userId;
  if (peopleObj.image === 'null') {
    delete peopleObj.image; // dont update image if not sent
 }
  const people = new People(peopleObj);
  
  console.log(people, 'people object');

  if (req.files) {
    req.files.forEach((file) => {
      if (hostname.includes("torama.ng")) {
        url = "https://api.torama.ng";
      } else {
        url = req.protocol + "://" + req.get("host");
      }
        const fPath = url + "/" + file.path;
      people.image = fPath;
      console.log(fPath)
    });
  }

  People.updateOne({ _id: req.params.id }, people)
  .then((result) => {
    if (result.n > 0) {
      res.status(200).json({ message: "Update successful!" });
    } else {
      res.status(401).json({ message: "Not authorized!" });
    }
  })
  .catch((error) => {
    res.status(500).json({
      message: "Couldn't update people! " + error,
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

     



      const oldPeople = await People.findById(recId).lean();
      if (!oldPeople) {
        return   res.status(500).json({ message: "No record to update! "  })
      }
      if (!oldPeople?.notes?.length) {
        oldPeople.notes = [];
      }
      const notes = [...oldPeople.notes, note];
      const people = new People({ notes: notes });
      people._id = recId;
      people.updater = req.userData.userId;
      // people.notes = [...notes];

      console.log(people)
      const updated = await People.updateOne({ _id: req.params.id }, people)

      // people.save();
      
      if (updated) {
        return res.status(200).json({ message: "Update successful! "  });
      } else {
        return res.status(500).json({ message: "Couldn't update People! " + JSON.stringify(inserted) })
      }
    } catch (error) {
      console.log(error)
      res.status(500).json({ message: "try error: Couldn't update People!" + error })
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
    People.findById(id)
      .then((people) => {
        if (people && people.image) {
          filePath = "uploads/" + people.image.split("/uploads/")[1];
          console.log(filePath);
        }
      })
      .catch((err) => {
        return res
          .status(401)
          .json({ message: "people not found in db!" + err });
      });
    // console.log('params ', req.params)
    People.deleteOne({ _id: req.params.id })
      .then((result) => {
        if (result.n > 0) {
          // delete people.image
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
          message: "Deleting people failed! " + error,
        });
      });
  } catch (error) {
    console.error(error, "catch err");
    return  res.status(500).json({
        message: "TryCatch: Deleting people failed! " + error,
      });
  }
});

router.get("", (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const peopleQuery = People.find().sort({name:1}).populate('linkedCustomer').populate('creator')
  if (pageSize && currentPage) {
    peopleQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  peopleQuery
    .then((documents) => {
      res.status(200).json({
        message: "peoples fetched successfully!",
        peoples: documents,
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching peoples failed! " + error,
      });
    });
});

router.get("/:id", (req, res, next) => {
  People.findById(req.params.id).populate('linkedCustomer').populate('creator')
    .then((people) => {
        if (people) {
            res.status(200).json({ people:people });
      } else {
        res.status(404).json({ message: "people not found!" });
      }
    })
      .catch((error) => {
        console.log(error)
      res.status(500).json({
        message: "Fetching people failed! " + error,
      });
    });
});

module.exports = router;
