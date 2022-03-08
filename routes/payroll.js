const express = require("express");
const mongoose = require("mongoose");

const Payroll = require("../models/payroll");
const People = require("../models/people");
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
  const DIR = "/var/images/payrollimages/";
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

router.post("", checkAuth, async  (req, res, next) => {
  try {
    const alloweds = process.env.ALLOWEDS;
  
    if (!alloweds.includes(req.userData.email)) {
      return res.status(500).json({ message: "Not allowed" });
    }
    
    let payObj = req.body;
  
    payObj.creator = req.userData.userId;
    
    // if (req.files) {
    //   req.files.forEach((file) => {
    //     if (hostname.includes("torama.ng")) {
    //       url = "https://api.torama.ng";
    //     } else {
    //       url = req.protocol + "://" + req.get("host");
    //     }
    //     const fPath = url + "/" + file.path;
    //     dObj.image = fPath;
    //   });
    // }
  
    Object.entries(payObj).forEach(([key, value]) => {
      if (
        !value ||
        value === undefined ||
        value === null ||
        value === "null" ||
        value === "undefined"
      ) {
        delete payObj[key];
      }
    });

    if (payObj.empType === 'REGULAR') {

    }

    if (payObj.empType === 'CONTRACT') {

    }
    
    // payObj.netPay = payObj.grossPay - payObj.deductions


    // console.log(dObj);
    let prl = new Payroll(payObj);
    const saved = await prl.save();
    
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
    
  } catch (error) {
    console.log(error)
    res.status(500).json({
      message: "Try error! " + error,
    });
  }
    
});

router.post("/csv", checkAuth, csvUpload.any(), async function (req, res, next) {
  let insertedIDs = [];
  try {
    const alloweds = process.env.ALLOWEDS;
  
    if ( !alloweds.includes(req.userData.email) ) {
      return res.status(500).json({ message: "Not allowed" });
    }
    
    let saveCounter = 0;
    const { csvUpload } = req.query;

    if (csvUpload === '1') {
      if (req.userData.role !== 'ADMIN') {
        return res.status(500).json({
          message: "Only ADMIN users can upload CSV",
        });
      }

      const oldPayrollsCount = await Payroll.countDocuments();

      let inserted, fPath;
      let prl = [];

      if (req.files) {
        fPath = req.files[0].path;
        
      }
      

      fs.createReadStream(fPath)
        .pipe(csv.parse({ headers: true }))
        .on('error', error => {
          console.error(error);
          return res.status(500).json({ message: "Try error! " + error })
        })
        .on('data', async row => {
          console.log(Object.entries(row), 'row objects')
      
          row.name = row['First Name'].trim();
          row.mname = row['Middle Name'].trim();
          row.lname = row['Last Name'].trim();
          row.empType = row['EMPLOYEE TYPE'].trim();

          if (row.mname) {
            row.name = row.name + ' ' + row.mname
          }

          if (row.lname) {
            row.name = row.name + ' ' + row.lname
          }
          if ( row['BASE SALARY'] ) {
            row.baseSalary = row['BASE SALARY'].trim();
          }

          row.payee = await People.findOne({ name: row.name })._id;

          if (!row.payee) {
            //  creating person.
            let person = { fname: row.fname, name: row.name, lname: row.lname, mname: row.mname || null, baseSalary: row.baseSalary|| null };
            const people = new People(person)
            const newPerson = await People.save(person);
            if (!newPerson) {
              return res.status(500).json({
                message: `Person ${row.name}  creation failed`
              });
            } 
            row.payee = newPerson._id;
          }

          // row.dob = new Date(row['DOB']);
          if (row['Bank Account']) {
            row.bankAccount = row['Bank Account'];
            console.log(`updating bank account of ${row.name}`)
            const bankUpdate = await People.updateOne({ name: row.name }, { bankAccount: row.bankAccount });
            if (bankUpdate) {
              console.log(`updated bank account of ${row.name} - ${bankUpdate}`);
            }
          }

          row.payeeTax = row['Payee Tax'];
          row.salaryAdvance = row['SALARY ADVANCE'];
          row.deductions = row.salaryAdvance + row.payeeTax;
          row.grossPay = 0;

          if (row['BAGS BAGGED']) {
            // bagger
            row.bagsBagged = row['BAGS BAGGED']
            row.grossPay += row['BAGS BAGGED'] * 2.5;
           
          }
          if (row['BAGS LOADED']) {
            row.bagsLoaded = row['BAGS LOADED'];
            row.grossPay += row['BAGS LOADED'] * 2;

          }

          if ( row.empType === 'REGULAR' ){
            const thisPerson = await People.findById(row.payee);
            row.grossPay += thisPerson.baseSalary;
          }

          if ( row.grossPay > 0 ) {
            row.netPay = row.grossPay - row.deductions
          } else {
            row.netPay = 0;
          }
          
          row.type = row['Type'];
          
          row.payStartDate = row['Payee Start Date'];
          row.payEndDate = row['Payee End Date'];
          const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

          const d = new Date(row.payEndDate);
          row.month = months[d.getMonth()];

          if (row['Company']) {
            row.company = row['Company'];
          }

          row.creator = req.userData.userId;
          prl.push(row);

        })
        .on('end',  async rowCount => {
          console.log(`Parsed ${rowCount} rows ${prl.length}`);
          for (var k = 0; k < prl.length; ++k) {
            inserted = await Payroll.create(prl[k]);
            insertedIDs.push(inserted._id);
          }
          
          const newPayrollsCount = await Payroll.countDocuments();
          const diff = newPayrollsCount - oldPayrollsCount;
          console.log(newPayrollsCount, oldPayrollsCount, 'before after rowcounts')

          if (diff > 0) {
            const delFile = await fs.unlink(fPath);
            if (delFile) {
              console.log('file deleted', delFile)
            }

            return res.status(200).json({
              message: "csv Uploaded  " + diff + " records"
            });
          } else {
            return res.status(500).json({message: "csv not uploaded"})
          }
        })
    } 
    
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Try error! " + error })
  } finally {
    
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
  payrollObj.netPay = +req.body.netPay
  payrollObj.grossPay = +req.body.grossPay
  payrollObj.deductions = +req.body.deductions
  const payroll = new Payroll(payrollObj);
  
  console.log(payroll, 'payroll object');

  if (req.files) {
    req.files.forEach((file) => {
      if (hostname.includes("torama.ng")) {
        url = "https://api.torama.ng";
      } else {
        url = req.protocol + "://" + req.get("host");
      }
        const fPath = url + "/" + file.path;
      payroll.image = fPath;
    });
  }

  // const pp = await payroll.save()

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
            console.log(url, ' url')
          }
          myPath = url + '/' + file.path;
          myPath = myPath.replace(/\/var\/images/, 'varimages');

          console.log(myPath, ' mypath')

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
  const payrollQuery = Payroll.find().sort({ createdAt: 1 }).populate('payee')
    .populate('creator', ['name', 'email', 'role'])
 

  if (pageSize && currentPage) {
    payrollQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  payrollQuery
    .then((documents) => {
      console.log(documents, 'docs');
      return res.status(200).json({
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

router.get("/getByText", checkAuth, async (req, res, next) => {
  
  try {
    const alloweds = process.env.ALLOWEDS;

    if ( !alloweds.includes(req.userData.email) ) {
      return res.status(500).json({ message: "Not allowed" });
    }

    const { searchTerm } = req.query;
    console.log(req.query, " req-query");

    let records;
    const result = await Payroll.aggregate([
      { $match: { $text: { $search: searchTerm} } },
    ])
      .sort({ createdAt: -1 })
      .limit(200);
    
    if (result) return res.status(200).json({ payrolls: result });

    Payroll.find({ $text: { $search: searchTerm } })
      .sort({ updatedAt: -1 })
      .populate("creator")
      .populate("payee")
      .limit(200)
      .then((record) => {
        if (record) {
          console.log(record.length);
          res.status(200).json({ payrolls: record });
        } else {
          res.status(404).json({ message: "Payroll record not found!" });
        }
      })
      .catch((error) => {
        res.status(500).json({
          message: "Fetching record failed!" + error,
        });
      });
    
  } catch (error) {
    console.log(error)
    res.status(404).json({ message: "try Block Error! " + error });
  }

  
});

router.get("/:id", (req, res, next) => {
  Payroll.findById(req.params.id).populate('payee') .populate('creator', ['name', 'email', 'role'])
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
