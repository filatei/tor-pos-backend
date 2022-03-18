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
const moment = require('moment');

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

function getBusinessDatesCount(startDate, endDate) {
  const s = new Date(startDate);
  const e = new Date(endDate);
  
  let count = 0;
  const curDate = new Date(s.getTime());
  while (curDate <= e) {
      const dayOfWeek = curDate.getDay();
      if(dayOfWeek !== 0 ) count++;
      curDate.setDate(curDate.getDate() + 1);
  }
  // alert(count);
  return count;
}

const checkAuth = require("../middleware/check-auth");

router.post("", checkAuth, async  (req, res, next) => {
  try {
    const { role, userId } = req.userData;

    if (!['ADMIN', 'GENERAL MANAGER', 'SNR ACCOUNTANT'].includes(role)) {
      return res.status(500).json({
        message: "Fetching payrolls failed! Not Allowed "
      });
    }
    
    let payObj = req.body;
    if (!payObj.payStartDate || !payObj.payEndDate) {
      return res.status(500).json({
        message: " Pay Start Date and End Date required"
      });
    }
  
    payObj.creator = req.userData.userId;
    payObj.year = +payObj.year;
    payObj.grossPay= +payObj.grossPay || 0;
    payObj.deductions = +payObj.deductions || 0;
    payObj.payeeTax = +payObj.payeeTax;
    payObj.bagsBagged = +payObj.bagsBagged;
    payObj.bagsLoaded = +payObj.bagsLoaded;
    payObj.salaryAdvance = +payObj.salaryAdvance;
    payObj.daysAbsent = +payObj.daysAbsent;

    if (payObj.daysAbsent) {
      const totalDays = getBusinessDatesCount(payObj.payStartDate, payObj.payEndDate);
      payObj.totalWorkDaysInMonth = totalDays;
      payObj.deductions += (payObj.daysAbsent / totalDays) * payObj.baseSalary;

    }

    if ( payObj.bagsBagged && payObj.type === 'MONTH-END' ) {
      payObj.grossPay +=  payObj.bagsBagged * 2.5;
    }

    if ( payObj.bagsBagged && payObj.type === 'MID-MONTH' ) {
      payObj.grossPay += payObj.bagsBagged * 0.5;
    }

    if ( payObj.bagsLoaded && payObj.type === 'MONTH-END' ) {
      payObj.grossPay += payObj.bagsLoaded * 2;
    }

    if ( payObj.bagsLoaded && payObj.type === 'MID-MONTH' ) {
      payObj.grossPay += payObj.bagsLoaded * 0.5;
    }

    if (payObj.baseSalary) {
      payObj.grossPay += +payObj.baseSalary;
    }

    payObj.netPay = payObj.grossPay - payObj.deductions - payObj.payeeTax - payObj.salaryAdvance; 
    console.log(payObj.netPay, 'netPay')

    if (payObj.netPay <= 0) {
      return res.status(500).json({
        message: "netPay is zero or negative: " + payObj.netPay + ' ' + payObj.type
      });
    }
  
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

    if (payObj.empType === 'CONTRACTOR') {

    }
    payObj.payeeMonthYrType = payObj.payee + payObj.month + payObj.year + payObj.type
    
    payObj.remarks = "via CSV Upload - " + payObj.payeeMonthYrType ;

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

router.post("/deleteAll", checkAuth, async (req, res, next) => {
 
  const { role, userID } = req.userData;

  if ( role !== 'ADMIN' ) {
    logIncident(req.userData.email, "Not allowed to delete ");
    return res.status(500).json({ message: "Only Admin Allowed to Delete" });
  }

  const { ids } = req.body;
  // console.log('deleteAll ', ids)

  try {
    const deleted = await Payroll.deleteMany({ _id: { $in: ids } });
    if (!deleted) {
      return  res.status(500).json({
        message: " Deleting payroll failed! No Payroll with such IDs " ,
      });
    }
    
    if ( deleted.n > 0 ) {
      console.log(deleted, 'deleted');
      return  res.status(200).json({
        message: `Deleted Successfully: ${deleted.deletedCount} records`
      });
    }
    
  } catch (error) {
    console.error(error, "catch err");
    return  res.status(500).json({
        message: "TryCatch: Deleting payroll failed! " + error,
      });
  }
});

router.post("/csv", checkAuth, csvUpload.any(), async function (req, res, next) {
  let insertedIDs = [];
  try {
    const { role, userId } = req.userData;

    if (!['ADMIN', 'GENERAL MANAGER', 'SNR ACCOUNTANT'].includes(role)) {
      return res.status(500).json({
        message: "Fetching payrolls failed! Not Allowed "
      });
    }
    
    let saveCounter = 0;
    const { csvUpload } = req.query;
    let exceptions = [];

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
          return res.status(500).json({ message: "fs createReadStream error! " + error })
        })
        .on('data', async row => {
          if (row['TYPE']) {
            row.type = row['TYPE'].trim();
          }

          if (!row.type) {
            return res.status(500).json({
              message: `Pay Type (MONTH-END or MID-MONTH)  Required `
            });
          }

          const today = new Date();
          const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          console.log(row['PAY START DATE'], row['PAY END DATE'], 'start end')
          if (row['PAY START DATE']) {
            const dt = row['PAY START DATE'].split('/');
            row.payStartDate = new Date(dt[2], dt[1]-1, dt[0])
          }

          if (row['PAY END DATE']) {
            const dt = row['PAY END DATE'].split('/');
            row.payEndDate = new Date(dt[2], dt[1]-1, dt[0])

            console.log(row['PAY END DATE'], row.payEndDate, 'end date')

            const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            row.month = months[row.payEndDate.getMonth()];
            row.year = row.payEndDate.getFullYear()
            console.log(row.month, 'month')
          }

          if (!row.month ) {
            return res.status(500).json({
              message: `Pay Month  Required include field 'PAY START DATE' and 'PAY END DATE' `
            });
          }

          if (!row.year ) {
            return res.status(500).json({
              message: `Pay YEAR  Required include field 'PAY START DATE' and 'PAY END DATE' `
            });
          }
          
          if (row['FIRST NAME']) {
            row.name = row['FIRST NAME'].trim();
            row.fname = row['FIRST NAME'].trim();
          }

          if (row['MIDDLE NAME']) {
            row.mname = row['MIDDLE NAME'].trim();
            row.name = row.name + ' ' + row.mname
          }
          if (row['LAST NAME']) {
            row.lname = row['LAST NAME'].trim();
            row.name = row.name + ' ' + row.lname
          }

          if (!row.fname || !row.lname) {
            return res.status(500).json({
              message: 'First Name and Last Name required'
            });
          }

          row.grossPay = 0;
          row.netPay = 0;
          row.deductions = 0;

          const payee = await People.findOne({ name: row.name });
          console.log(row.name,payee.name, ' row.name payee ')
          if (!payee) {
            return res.status(500).json({
              message: `Person ${row.name}  Not in DB. Create FIRST`
            })
            
          } else {
            row.payee = payee._id;
          }

          if (row['EMPLOYEE TYPE']) {
            row.empType = row['EMPLOYEE TYPE'].trim();
          }

          if (row['DEDUCTION']) {
            row.deductions = +row['DEDUCTION'];
          }
          if (row['PAYEE TAX']) {
            row.payeeTax = +row['PAYEE TAX'];
            row.deductions +=  row.payeeTax;
          }

          if (row['SALARY ADV']) {
            row.salaryAdvance = +row['SALARY ADV'];
            row.deductions +=  row.salaryAdvance;
          }

          if (row['DAYS WORKED']) {
            row.daysAbsent = 0;
            if (row['DAYS ABS']) {
              row.daysAbsent = +row['DAYS ABS'];
            }
           
            row.daysWorked = +row['DAYS WORKED'];
            const totalDays = row.daysAbsent + row.daysWorked;
            row.totalWorkDaysInMonth = totalDays;
            console.log(totalDays, 'totalDays')

            const thisPerson = await People.findById(row.payee);
            row.baseSalary = +thisPerson.baseSalary;

            if (!row.baseSalary) {
              return res.status(500).json({
                message: `Person ${thisPerson.name} has no baseSalary set`
              });
            }
            row.grossPay = row.baseSalary;
            
            row.deductions += (row.daysAbsent/totalDays)* row.baseSalary
          }

          // row.dob = new Date(row['DOB']);
          if (row['BANK ACCOUNT']) {
            row.bankAccount = row['BANK ACCOUNT']?.trim();
            console.log(`updating bank account of ${row.name}`)
            const bankUpdate = await People.updateOne({ name: row.name }, { bankAccount: row.bankAccount });
            if (bankUpdate) {
              console.log(`updated bank account of ${row.name} - ${bankUpdate}`);
            }
          }

          if (row['COMPANY']) {
            row.company = row['COMPANY'];
          }
         
          if (row['BAGS BAGGED'] ) {
            // bagger
            row.bagsBagged = +row['BAGS BAGGED'];
            if (row.type == 'MONTH-END')
              row.grossPay += row.bagsBagged * 2.5;
            if (row.type == 'MID-MONTH')
              row.grossPay += row.bagsBagged * 0.5;
          }

          if (row['BAGS LOADED']) {
            row.bagsLoaded = +row['BAGS LOADED'];

            if (row.type === 'MONTH-END') { row.grossPay += row.bagsLoaded * 2; }
            else if (row.type === 'MID-MONTH') {
              row.grossPay += row.bagsLoaded * 0.5;
            }
          }
          if (row.grossPay > 0) {
              console.log(row.grossPay, ' grossPay', row.deductions, ' deduct')
             row.netPay = row.grossPay - row.deductions
          } else {
            row.netPay = 0;
          }

          row.creator = req.userData.userId;
          row.payeeMonthYrType = row.payee + row.month + row.year + row.type;
          row.remarks = "via CSV Upload - " + row.payeeMonthYrType ;
          // if (row.netPay) {
            prl.push(row);
          // } else {
            
          // }
          if (row.netPay === 0) {
            exceptions.push(row);
          }

          if (row.payee ) {
           
              const payroll = new Payroll(row);
              inserted = await payroll.save();
              insertedIDs.push(inserted);
              // console.log(ppl.length)
          }
        })
        .on('end', async rowCount => {
          setTimeout( async () => {
            console.log(`Parsed ${rowCount} rows ${prl.length}`);
            // for (var k = 0; k < prl.length; ++k) {
            //   try {
            //     const payroll = new Payroll(prl[k]);
            //     inserted = await payroll.save();
            //     // console.log(inserted, 'inserted')
            //     // inserted = await Payroll.create(prl[k]);
            //     insertedIDs.push(inserted._id);
            //   } catch (error) {
            //     return res.status(500).json({message: 'try error in save ' + error})
            //   }
            // }
            
            const newPayrollsCount = await Payroll.countDocuments();
            const diff = newPayrollsCount - oldPayrollsCount;
            console.log(newPayrollsCount, oldPayrollsCount, 'before after rowcounts')
            fs.unlink(fPath, (err => {
              if (err) console.log(err);
              else {
                console.log(`\nDeleted file: ${fPath}`);
              }
            }));

            if (diff > 0) {
              
              // console.log(exceptions, 'exceptions')

              return res.status(200).json({
                message: "csv Uploaded  " + diff + " records except " + exceptions.length + " records",
                exceptions: exceptions
              });
            } else {
              return res.status(500).json({message: "csv not uploaded"})
            }
          }, 2000);
          
        })
    } 
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Try error! " + error })
  }
});

router.post("/csvValidate", checkAuth, csvUpload.any(), async function (req, res, next) {

  const { role, userId } = req.userData;
  if (!['ADMIN', 'GENERAL MANAGER', 'SNR ACCOUNTANT'].includes(role)) {
    return res.status(500).json({
      message: "Fetching payrolls failed! Not Allowed "
    });
  }

  try {
    let saveCounter = 0;
    const { csvUpload } = req.query;
    const oldPayrollsCount = await Payroll.countDocuments();
    console.log('csvValidate in Payroll')

    let inserted, fPath;
    let prl = [];
    let exceptions = [];

    if (req.files) {
      fPath = req.files[0].path;
    }
  
    fs.createReadStream(fPath)
    .pipe(csv.parse({ headers: true }))
    .on('error', error => {
      console.error(error);
      return res.status(500).json({ message: "fs createReadStream error! " + error })
    })
    .on('data', async row => {

      if (!row['TYPE']) {
        row.typeRequired = 'YES'
      } else if (
        !['MONTH-END', 'MID-MONTH', 'OTHER'].includes(row['TYPE'])
      ) {
        row.typeRequired = 'YES'
      }

      const today = new Date();
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      console.log(row['PAY START DATE'], row['PAY END DATE'], 'start end')
      if (!row['PAY START DATE']) {
        row.payStartRequired = 'YES'
      }

      if (!row['PAY END DATE']) {
        row.payEndRequired = 'YES'
      }
     
      if (row['FIRST NAME']) {
        row.name = row['FIRST NAME'].trim();
        // row.fname = row['FIRST NAME'].trim();
      }

      if (row['MIDDLE NAME']) {
        row.name = row.name + ' ' + row['MIDDLE NAME'].trim();
      }
      if (row['LAST NAME']) {
        row.name = row.name + ' ' + row['LAST NAME'].trim();
      }

      if (!row['FIRST NAME'] || !row['LAST NAME']) {
        row.firstOrLastNameRequired = 'YES'
      }

      const payee = await People.findOne({ name: row.name });
      if (!payee) {
        row.payeeNotInDB = 'YES'
      } 
      
      if (row.payEndRequired || row.payeeNotInDB 
        || row.firstOrLastNameRequired
        || row.baseSalaryRequired
        || row.payStartRequired
        || row.payEndRequired) {
          exceptions.push(row);

        }
    })
    .on('end', async rowCount => {
      setTimeout( async () => {
        console.log(`Parsed ${rowCount} rows ${prl.length}`);

          fs.unlink(fPath, (err => {
            if (err) console.log(err);
            else {
              console.log(`\nDeleted file: ${fPath}`);
            }
          }));
          console.log(exceptions, 'exceptions')

          return res.status(200).json({
            message: `File has ${exceptions.length} issues`,
            exceptions:  exceptions
          });
          
      }, 3000);
      
    })
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Try error! " + error })
  }
});

router.put("/:id", checkAuth, upload.any(), async (req, res, next) => {
  const { role, userId } = req.userData;

  if (!['ADMIN', 'GENERAL MANAGER', 'SNR ACCOUNTANT'].includes(role)) {
    return res.status(500).json({
      message: "Fetching payrolls failed! Not Allowed "
    });
  }
  let path = "";
  let url = "";
  let payrollObj = req.body;

  const id = req.params.id;
  payrollObj._id = id;
  payrollObj.updater = userId;
  if (payrollObj.image === 'null') {
    delete payrollObj.image; // dont update image if not sent
  }
  payrollObj.netPay = +req.body.netPay
  payrollObj.grossPay = +req.body.grossPay
  payrollObj.deductions = +req.body.deductions
  const payroll = new Payroll(payrollObj);

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
    try {
      const alloweds = process.env.ALLOWEDS;
      if (!alloweds.includes(req.userData.email)) {
        return res.status(500).json({ message: "Not allowed" });
      }
      
      const text = req.body.text;
      const date = req.body.date;


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
  const { role, userID } = req.userData;
  if ( role !== 'ADMIN' ) {
    logIncident(req.userData.email, "Not allowed to delete ");
    return res.status(500).json({ message: "Only Admin Allowed to Delete" });
  }

  const id = req.params.id;

  try {
    Payroll.deleteOne({ _id: req.params.id })
      .then((result) => {
        if (result.n > 0) {
          res.status(200).json({ message: "Deletion successful!" });
        } else {
          res.status(401).json({ message: "Not Deleted!" });
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

router.get("",  checkAuth, async (req, res, next) => {

  const { role } = req.userData;

  if (!['ADMIN', 'GENERAL MANAGER', 'SNR ACCOUNTANT'].includes(role)) {
    return res.status(500).json({
      message: "Fetching payrolls failed! Not Allowed "
    });
  }
  const pageSize = +req.query.pagesize;
  const { month, year, type } = req.query;
  const currentPage = +req.query.page;
  let payrollQuery;
  if (year && month && type) {
    
    payrollQuery =  Payroll.find({ month: month, year: +year, type: type })
      .sort({ createdAt: 1 })
      .populate('payee')
      .populate('creator', ['name', 'email', 'role']);
    
  } else {
    payrollQuery =  Payroll.find().sort({ createdAt: 1 }).populate('payee')
    .populate('creator', ['name', 'email', 'role'])
  }

  if (pageSize && currentPage) {
    payrollQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  payrollQuery
    .then((documents) => {
      return res.status(200).json({
        message: "payrolls fetched successfully!",
        payrolls: documents,
      });
    })
    .catch((error) => {
      return res.status(500).json({
        message: "Fetching payrolls failed! " + error,
      });
    });
});

router.get("/getByName", checkAuth, async (req, res, next) => {
  
  try {
    const { role } = req.userData;

    if (!['ADMIN', 'GENERAL MANAGER', 'SNR ACCOUNTANT'].includes(role)) {
      return res.status(500).json({
        message: "Fetching payrolls failed! Not Allowed "
      });
    }

    const { searchTerm } = req.query;
    let sTerm  =  searchTerm?.toUpperCase()?.trim()
    console.log(sTerm, "sterm");
    const matchedPeople = await People.find({ 'name': { '$regex': sTerm } })
  
    console.log(matchedPeople, 'matched')
    let records = [];
    matchedPeople.forEach( async m => {
      let mPay = await Payroll.findOne({ payee: m._id }).populate('payee').populate('creator')
      if (mPay) {
        records.push(mPay)

      }
    })
    
    setTimeout(() => {

      if (records) {
        return res.status(200).json({ payrolls: records })
      }
      else {
        return res.status(404).json({ message: "No records! "  });
      }
    }, 1000);
    
  } catch (error) {
    console.log(error)
    res.status(404).json({ message: "try Block Error! " + error });
  }
  
});


router.get("/getByText", checkAuth, async (req, res, next) => {
  
  try {
    const { role } = req.userData;

    if (!['ADMIN', 'GENERAL MANAGER', 'SNR ACCOUNTANT'].includes(role)) {
      return res.status(500).json({
        message: "Fetching payrolls failed! Not Allowed "
      });
    }
    const { searchTerm } = req.query;
    console.log(req.query, " req-query");

    let records;
    const result = await Payroll.aggregate([
      { $match: { $text: { $search: searchTerm} } },
    ])
    .sort({name:1})
    .limit(200);
    
    if (result) {
      // result.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0))
      return res.status(200).json({ payrolls: result });
    }

    // Payroll.find({ $text: { $search: searchTerm } })
    //   .sort({ updatedAt: -1 })
    //   .populate("creator")
    //   .populate("payee")
    //   .limit(200)
    //   .then((record) => {
    //     if (record) {
    //       console.log(record.length);
    //       res.status(200).json({ payrolls: record });
    //     } else {
    //       res.status(404).json({ message: "Payroll record not found!" });
    //     }
    //   })
    //   .catch((error) => {
    //     res.status(500).json({
    //       message: "Fetching record failed!" + error,
    //     });
    //   });
    
  } catch (error) {
    console.log(error)
    res.status(404).json({ message: "try Block Error! " + error });
  }

  
});

router.get("/:id", checkAuth, (req, res, next) => {
  const { role } = req.userData;

  if (!['ADMIN', 'GENERAL MANAGER', 'SNR ACCOUNTANT'].includes(role)) {
    return res.status(500).json({
      message: "Fetching payrolls failed! Not Allowed "
    });
  }

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
