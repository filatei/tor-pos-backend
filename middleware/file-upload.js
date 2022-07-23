const multer = require("multer");
// const uuid = require("uuid/v1");

const OUTDIR = "/var/www/uploads/awards";
const path = require("path");
const fs = require("fs");

const createDir = async () => {
  if (fs.existsSync(path.join( OUTDIR))) {
    return;
  }
  await fs.mkdir(path.join( OUTDIR), function (err) {
    if (err) {
      console.log("failed to create directory");
      return console.error(err);
    } else {
      console.log("Directory created successfully");
    }
  });
};

createDir();

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

const fileUpload = multer({
  limits: 700000,
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, OUTDIR);
    },
    filename: (req, file, cb) => {
      const ext = MIME_TYPE_MAP[file.mimetype];
      cb(null, new Date().getTime() + "." + ext);
    },
  }),
  fileFilter: (req, file, cb) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    let error = isValid ? null : new Error("Invalid mime type!");
    cb(error, isValid);
  },
});

module.exports = fileUpload;
