const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
const DIR = "/uploads";

// /download?filename=pms.apk
router.get("/download", (req, res) => {
  const myFile = req.query.filename;
  console.log(myFile);
  const file = `${__dirname}/../uploads/${myFile}`;
  console.log(file);

  res.download(file); // Set disposition and send it.
});

module.exports = router;
