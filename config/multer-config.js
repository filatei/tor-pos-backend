const multer = require("multer");
const os = require("os");
const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "application/pdf": "pdf",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

const generateFileName = (req, file, cb) => {
  const fileName =
    new Date().getTime() +
    "-" +
    file.originalname.toLowerCase().split(" ").join("-") +
    "." +
    MIME_TYPE_MAP[file.mimetype];
  cb(null, fileName);
}

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype == "image/gif" ||
    file.mimetype == "image/png" ||
    file.mimetype == "image/jpg" ||
    file.mimetype == "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
    return cb(new Error("Only .gif, .png, .jpg and .jpeg format allowed!"));
  }
}

const multerConfig = (DIR) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, DIR);
    },
    filename: generateFileName
  });

  return multer({
    storage: storage,
    limits: {
      fileSize: 1024 * 1024 * 1, // 1MB
    },
    fileFilter: fileFilter
  });
}

module.exports = multerConfig;
