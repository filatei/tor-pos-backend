const express = require("express");
const Photo = require("../models/photo");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
var multer = require("multer");
const DIR = "./uploads/photoimages/";

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "application/pdf": "pdf",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(DIR)) {
        fs.mkdirSync(DIR, { recursive: true });
      }
    } catch (err) {
      throw err;
    }
    cb(null, DIR);
  },
  filename: (req, file, cb) => {
    const fileName =
      new Date().getTime() +
      "-" +
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
    fileSize: 1024 * 1024 * 1,
  },
  fileFilter: (req, file, cb) => {
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
  },
});

const checkAuth = require("../middleware/check-auth");
const Accesslog = require("../models/accesslog");

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

router.post("", checkAuth, upload.single("image"), function (req, res, next) {
  let myPath = "";
  let url = "";
  let photoObj = req.body;
  const photo = new Photo(photoObj);
  photo.creator = req.userData.userId;
  console.log(photo, req.file);
  if (req.file) {
    if (hostname.includes("torama")) {
      url = "https://api.torama.ng";
    } else {
      url = req.protocol + "://" + req.get("host");
    }
    myPath = url + "/" + req.file.path;

    photo.filePath = myPath;

    photo
      .save()
      .then((result) => {
        res.status(201).json({
          message: "Photo added successfully",
          photo: { ...result, id: result._id },
        });
      })
      .catch((error) => {
        res.status(500).json({
          message: "Creating a photo failed! " + error,
        });
      });
  }
});

router.put(
  "/:id",
  checkAuth,
  upload.single("image"),
  async (req, res, next) => {
    let myPath = "";
    let url = "";
    let photoObj = req.body;

    const updater = req.userData.userId;
    const id = req.params.id;
    photoObj._id = id;
    photoObj.updater = updater;
    const photo = new Photo(photoObj);
    const tag = req.body.tag;
    console.log(tag, "tag");
    if (tag) {
      const existingPhoto = await Photo.findById(id);
      photo.tags = [{ text: tag }, ...existingPhoto.tags];
    }

    if (req.file && req.file.filename && req.file.filename.length > 0) {
      if (hostname.includes("torama")) {
        url = "https://api.torama.ng";
      } else {
        url = req.protocol + "://" + req.get("host");
      }

      myPath = url + "/" + req.file.path;
      photo.filePath = myPath;
    }
    Photo.updateOne({ _id: req.params.id }, photo)
      .then((result) => {
        if (result.n > 0) {
          res.status(200).json({ message: "Update successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch((error) => {
        res.status(500).json({
          message: "Couldn't update photo! " + error,
        });
      });
  }
);

router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to delete ");
    return res.status(500).json({ message: "Not allowed" });
  }

  let filePath;
  Photo.findById(req.params.id)
    .then((photo) => {
      if (photo && photo.icon) {
        filePath = "uploads/" + photo.icon.split("/uploads/")[1];
        // console.log(filePath)
      }
    })
    .catch((err) => {
      return res.status(401).json({ message: "photo not found in db!" + err });
    });
  // console.log('params ', req.params)
  Photo.deleteOne({ _id: req.params.id })
    .then((result) => {
      if (result.n > 0) {
        // delete photo.icon
        if (filePath) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(err);
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
      console.error(error);
      res.status(500).json({
        message: "Deleting photo failed! " + error,
      });
    });
});

router.get("", (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const photoQuery = Photo.find().populate("creator");
  if (pageSize && currentPage) {
    photoQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  photoQuery
    .then((documents) => {
      res.status(200).json({
        message: "Photos fetched successfully!",
        photos: documents,
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching photos failed! " + error,
      });
    });
});

router.get("/:id", (req, res, next) => {
  Photo.findById(req.params.id)
    .populate("creator")
    .then((photo) => {
      if (photo) {
        res.status(200).json(photo);
      } else {
        res.status(404).json({ message: "photo not found!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Fetching photo failed! " + error,
      });
    });
});

module.exports = router;
