const express = require("express");
const mongoose = require("mongoose");

const People = require("../models/people");
const Site = require("../models/site");
const Payroll = require("../models/payroll");
const Accesslog = require("../models/accesslog");
const router = express.Router();
const Path = require("path");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
const csv = require('fast-csv');

var multer = require("multer");

const MIME_TYPE_MAP = {
    "image/png": "png",
    "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "text/csv": "csv",
  };
  const DIR = "./uploads/peopleimages/";
  const csvDIR = "/tmp/csv/";
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

  const csvStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      userid = req.userData.userId;
      try {
        if (!fs.existsSync(csvDIR)) {
          fs.mkdirSync(csvDIR, { recursive: true });
        }
      } catch (err) {
        throw err;
      }
      cb(null, csvDIR);
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

  var csvUpload = multer({
    storage: csvStorage,
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
const site = require("../models/site");

router.post("", checkAuth, upload.any(), async function (req, res, next) {
  try {
    const alloweds = process.env.ALLOWEDS;
  
    if (!alloweds.includes(req.userData.email)) {
      return res.status(500).json({ message: "Not allowed" });
    }
    
    let saveCounter = 0;
    let dObj = req.body;
  
    dObj.creator = req.userData.userId;
    if (dObj.nextOfKin) {
      dObj.nextOfKin.name = req.body?.nextOfKinName;
      dObj.nextOfKin.phone = req.body?.nextOfKinPhone;
      dObj.nextOfKin.relationship = req.body?.nextOfKinRelationship;
    }
    
    if (dObj.site) {
      if (dObj.site === 'KPANSIA-E') dObj.site = 'KPANSIA E';

      const site = await Site.findOne({ name: dObj.site });
      if (site) {
        dObj.site = site._id;
      }
    }
    
    
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
    
  } catch (error) {
    console.log(error)
    res.status(500).json({
      message: "Try error! " + error,
    });
  }
    
});

router.post("/csv", checkAuth, csvUpload.any(), async function (req, res, next) {
  let insertedIDs = [];
  const oldPeoples = await People.countDocuments();
  try {
    const alloweds = process.env.ALLOWEDS;
  
    if ( !alloweds.includes(req.userData.email) ) {
      return res.status(500).json({ message: "Not allowed" });
    }
    
    let saveCounter = 0;
    const { csvUpload } = req.query;
    let inserted, fPath;
      let ppl = [];

    if (csvUpload === '1') {

      if (req.userData.role !== 'ADMIN') {
        return res.status(500).json({
          message: "Only ADMIN users can upload CSV",
        });
      }

      if (req.files) {
        fPath =  req.files[0].path;
      }

      fs.createReadStream(fPath)
        .pipe(csv.parse({ headers: true }))
        .on('error', error => {
          console.error(error);
          return res.status(500).json({ message: "Try error! " + error })
        })
        .on('data',  async row => {
      
          if (row['FIRST NAME']) {
            row.fname = row['FIRST NAME']?.trim();
            row.name = row['FIRST NAME']?.trim();
          } else {
            return res.status(500).json({message: "FIRST NAME REQUIRED"})
          }
          
          if (row['MIDDLE NAME']) {
            row.mname = row['MIDDLE NAME']?.trim();
            row.name += ' ' + row.mname;
          }
         
          if (row['LAST NAME']) {
            row.lname = row['LAST NAME']?.trim();
            row.name += ' ' + row.lname;
          } else {
            return res.status(500).json({message: "LAST NAME REQUIRED"})
          }
          

          if (row['NAME ON ODOO']) {
            row.nameOnOdoo = row['NAME ON ODOO']?.trim();
          }
         
          if (row['BANK ACCOUNT']) {
            row.bankAccount = row['BANK ACCOUNT'].trim();
          }

          if (row['PHONE']) {
            if (row['PHONE'].substr(0,1) !== '0') {
              row.phone = '0' +row['PHONE'].trim();
            } else {
              row.phone = row['PHONE'].trim();
            }
          }

          if (row['TYPE']) {
            row.type = row['TYPE'].trim();
          }

          if (row['STATUS']) {
            row.status = row['STATUS'].trim();
          }

          if (row['EMAIL']) {
            row.type = row['EMAIL'].trim();
          }
          
          if (row['NEXT OF KIN NAME']) {
            row.nextOfKin.name = row['NEXT OF KIN NAME'].trim();
          }

          if (row['NEXT OF KIN PHONE']) {
            if (row['NEXT OF KIN PHONE'].substr(0,1) !== '0') {
              row.nextOfKin.phone = '0' +row['NEXT OF KIN PHONE'].trim();
            } else {
              row.nextOfKin.phone = row['NEXT OF KIN PHONE'].trim();
            }
          }

          if ( row['NEXT OF KIN RELATIONSHIP'] ) {
            row.nextOfKin.relationship = row['NEXT OF KIN RELATIONSHIP'].trim();
          }

          if ( row['DEPARTMENT'] ) {
            row.department = row['DEPARTMENT'].trim();
          }

          if (row['COMPANY']) {
            row.company = row['COMPANY'].trim();
          }

          // row['Gender'].trim()?row.gender = row['Gender'].trim() : null;
          if ( row['NIN'] ) {
            row.nin = row['NIN'].trim();
          }
          if ( row['IDENTIFICATION'] ) {
            row.identification = row['IDENTIFICATION'].trim();
          }

          if (row['ADDRESS']) {
            row.address = row['ADDRESS'].trim();
          }
          
          if (row['BASE SALARY']) {
            row.baseSalary = row['BASE SALARY']
          }

          if (row['DESIGNATION']) {
            row.jobName = row['DESIGNATION'].trim();
          }

          if (row['LOCATION']) {
            const site = await Site.findOne({ name: row['LOCATION'].trim() }).lean();
            if (site) {
              row.site = site._id
            }
          }

          row.creator = req.userData.userId;
          //  check if peorson already exists in DB
         
          // console.log(row.name)
          if (row.name ) {
            const person = await People.findOne({ name: row.name });
            if (!person) {
              // console.log(person, ' person')
              const people = new People(row);
              inserted = await people.save();
              insertedIDs.push(inserted);
              ppl.push(row);
              // console.log(ppl.length)
            }
          }
        })
        .on('close', function () {
          console.log('read stream closed');
          console.log(insertedIDs.length, ppl.length, ' inserted ppl')
          
        })
        .on('end',  async rowCount => {
          
          setTimeout(function () {
            // the destroy method can be used to
            // close the stream manually
            console.log(`Parsed ${rowCount} rows ${ppl.length}`);
            if (ppl.length) {
              fs.unlink(fPath, (err => {
                if (err) console.log(err);
                else {
                  console.log(`\nDeleted file: ${fPath}`);
                }
              }));
              return res.status(200).json({
                message: "csv Uploaded  " + insertedIDs.length + " records out of " + rowCount
              });
            } else {
              return res.status(500).json({message: "csv not uploaded"})
            }
      
          }, 3000);
          
          
        })
    } 
    
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Try error! " + error })
  } finally {
    // const newPeoples = await People.countDocuments();

    
  }
  
    
});

router.post("/csvValidate", checkAuth, csvUpload.any(), async function (req, res, next) {

  if (!['ADMIN', 'GENERAL MANAGER', 'SNR ACCOUNTANT'].includes(req.userData.role )) {
    return res.status(500).json({
      message: "Only ADMIN and GM and SNR ACCOUNTANT  can Validate CSV",
    });
  }
  
  let insertedIDs = [];
  let exceptions = [];
  const oldPeoples = await People.countDocuments();
  console.log(oldPeoples, 'oldPeoples')
  try {
   
    let saveCounter = 0;
    let inserted, fPath;
      let ppl = [];
      if (req.files) {
        fPath =  req.files[0].path;
      }

      fs.createReadStream(fPath)
        .pipe(csv.parse({ headers: true }))
        .on('error', error => {
          console.error(error);
          return res.status(500).json({ message: "Try error! " + error })
        })
        .on('data',  async row => {
      
          if (!row['FIRST NAME'] || !row['LAST NAME'] ) {
            row.firstOrLastNameRequired = "YES"
          } 
          
          // console.log(row.name)
          let name;
          if (row['FIRST NAME'] && row['LAST NAME']) {
            if (row['MIDDLE NAME']) {
               name = row['FIRST NAME'] + ' '+  row['MIDDLE NAME']  + ' ' + row['LAST NAME']
            } else {
               name = row['FIRST NAME'] +  ' ' + row['LAST NAME']
            }
            row['NAME'] = name;
            const person = await People.findOne({ name:  name});
            if (person) {
              row.personInDB = 'YES'
            }
          }
          if (row.personInDB || row.firstOrLastNameRequired ) {
            exceptions.push(row)
          }
        })
        .on('close', function () {
          console.log(insertedIDs.length, ppl.length, ' inserted ppl')
          
        })
        .on('end',  async rowCount => {
          
          setTimeout( () => {
            // the destroy method can be used to
            // close the stream manually
            console.log(`Parsed ${rowCount} rows ${ppl.length}`);
              fs.unlink(fPath, (err => {
                if (err) console.log(err);
                else {
                  console.log(`\nDeleted file: ${fPath}`);
                }
              }));
            
              return res.status(200).json({
                message: `csv file has ${exceptions.length} issues` ,
                exceptions: exceptions
              });
             
      
          }, 3000);
          
          
        })
    
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Try error! " + error })
  } finally {
    // const newPeoples = await People.countDocuments();

    
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

router.delete("/:id", checkAuth, async (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to delete ");
    return res.status(500).json({ message: "Not allowed" });
  }
  const id = req.params.id;
  let filePath;

  const payrolls = await Payroll.find({ payee: id });
  if (payrolls?.length) {
    return res.status(500).json({ message: `Can't Delete Person with Payroll(${payrolls.length})` });
  }

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
  const peopleQuery = People.find().sort({fname:1}).populate('site').populate('manager').populate('creator')
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

router.get("/getByText", checkAuth, async (req, res, next) => {
  
  try {
    const alloweds = process.env.ALLOWEDS;

    if ( !alloweds.includes(req.userData.email) ) {
      return res.status(500).json({ message: "Not allowed" });
    }

    const { searchTerm } = req.query;
    console.log(req.query, " req-query");

    let records;
    const result = await People.aggregate([
      { $match: { $text: { $search: searchTerm} } },
    ])
      .sort({ createdAt: -1 })
      .limit(200);
    
    if (result) {
      return res.status(200).json({ peoples: result });
      // const populatedResult = await People.populate(result, { path: 'site' });
      // if (populatedResult) {
      //    console.log(populatedResult, ' pop result')
      //   return res.status(200).json({ peoples: result });
      // }
    } else {
      return res.status(404).json({ message: "Not Found"  });
    }

    People.find({ $text: { $search: searchTerm } })
      .sort({ updatedAt: -1 })
      .populate("creator").populate('site')
      .limit(200)
      .then((record) => {
        if (record) {
          // console.log(record.length);
          return res.status(200).json({ peoples: record });
        } else {
          return res.status(404).json({ message: "People record not found!" });
        }
      })
      .catch((error) => {
        return res.status(500).json({
          message: "Fetching record failed!" + error,
        });
      });
    
  } catch (error) {
    console.log(error)
    res.status(404).json({ message: "try Block Error! " + error });
  }

  
});

router.get("/:id", (req, res, next) => {
  People.findById(req.params.id).populate('site').populate('creator')
    .then((people) => {
        if (people) {
          console.log(people)
            return res.status(200).json({ people:people });
      } else {
        return res.status(404).json({ message: "people not found!" });
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
