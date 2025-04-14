const multer = require("multer");

const OUTDIR = "uploads/excel_files";
const path = require("path");
const fs = require("fs");

const createDir = async () => {
  if (fs.existsSync(path.join(__dirname, "..", OUTDIR))) {
    return;
  }
  await fs.mkdir(path.join(__dirname, "..", OUTDIR), function (err) {
    if (err) {
      console.log("failed to create directory");
      return console.error(err);
    } else {
      console.log("Directory created successfully");
    }
  });
};

createDir();

const excelFilter = (req, file, cb) => {
  if (
    file.mimetype.includes("excel") ||
    file.mimetype.includes("spreadsheetml")
  ) {
    cb(null, true);
  } else {
    cb("Please upload only excel file.", false);
  }
};

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __basedir + OUTDIR);
  },
  filename: (req, file, cb) => {
    var ext = path.extname(file.originalname);
    console.log(file.originalname, ext);
    cb(null, `${Date.now()}-xls-${file.originalname}${ext}`);
  },
});

var uploadFile = multer({ storage: storage, fileFilter: excelFilter });
module.exports = uploadFile;
