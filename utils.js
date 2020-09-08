var multer  = require('multer')
const DIR = './uploads/recuploads/';
const moment = require('moment')
const path = require('path')

const fs = require('fs');
const os = require("os");
const hostname = os.hostname();
const homedir = os.homedir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    userid = req.userData.userId
    const myDir = DIR + userid + '/'
    try {
      if (!fs.existsSync(myDir)){
        fs.mkdirSync(myDir, {recursive: true});
      }
    }
    catch (err) {
      throw err
    }
    cb(null, myDir);
  },
  filename: (req, file, cb) => {
    const fileName = req.userData.userId + '-' + new Date().getTime() + file.originalname.toLowerCase().split(' ').join('-');
   
    cb(null, fileName)
  }
});

// Multer Mime Type Validation
var upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 10
  },
  fileFilter: (req, file, cb) => {
    // console.log(file.mimetype)
    if (file.mimetype == "image/png" || file.mimetype == "image/jpeg" || file.mimetype == "image/jpg") {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error('Only .png or .jpg format allowed!'));
    }
  }
});

const storage2 = multer.diskStorage({
  destination: (req, file, cb) => {
    userid = req.userData.userId
    const myDir = 'uploads/expenses/' + userid + '/'
    try {
      if (!fs.existsSync(myDir)){
        fs.mkdirSync(myDir, {recursive: true});
      }
    }
    catch (err) {
      throw err
    }
    cb(null, myDir);
  },
  filename: (req, file, cb) => {
    const fileName = req.userData.userId + '-' + new Date().getTime() + file.originalname.toLowerCase().split(' ').join('-') + path.extname(file.originalname);
   
    cb(null, fileName)
  }
});

var upload2 = multer({
  storage: storage2,
  limits: {
    fileSize: 1024 * 1024 * 10
  },
  fileFilter: (req, file, cb) => {
    // console.log(file.mimetype)
    if (file.mimetype == "image/png" || file.mimetype == "image/jpeg" || file.mimetype == "image/jpg") {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error('Only .png or .jpg format allowed!'));
    }
  }
});

module.exports = { upload, upload2 }
