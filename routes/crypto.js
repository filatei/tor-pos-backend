const Crypto = require("../models/crypto");
const express = require("express");
const router = express.Router();
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();

const homedir = os.homedir();
const cryptoTokens = require(`${homedir}/.crypto.json`);
const binance = require(`${homedir}/.binance.json`);
const retry = require('retry');
const operation = retry.operation({
  retries: 5,
  factor: 3,
  minTimeout: 1 * 1000,
  maxTimeout: 60 * 1000,
  randomize: true,
});

const rp = require('request-promise');



const MyMail = require("../mail");
const _ = require("lodash");
var multer = require("multer");
const checkAuth = require("../middleware/check-auth");
const Mail = require("nodemailer/lib/mailer");
const DIR = "./uploads/cryptoimages/";
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

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "application/pdf": "pdf",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

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



router.post("/", checkAuth, async (req, res, next) => {
  

  const crypto = new Crypto({
    name: req.body.name,
    id: req.body.id,
    rank: req.body.rank,
    priceUsd: req.body.priceUsd,
    symbol: req.body.symbol,
    creator: req.userData.userId
  });

  crypto
    .save()
    .then(async (result) => {
      // console.log(result);
      delete result.password;
      res.status(201).json({
        message: "Crypto created!",
        result: result,
      });
    })
    .catch((err) => {
      res.status(500).json({
        message: "Invalid crypto data! " + err,
      });
    });
});

router.put("/:id", checkAuth, upload.single("image"), (req, res, next) => {
  let cryptoObj = req.body;
  cryptoObj._id = req.params.id;
  let url = "";
  let path;
  if (!req.body.name || !req.body.email) {
    return res.status(500).json({
      message: "Empty Update request. name or email cant be empty " + error,
    });
  }
  if (req.file) {
    if (hostname.includes("torama")) {
      url = "https://api.torama.ng";
    } else {
      url = req.protocol + "://" + req.get("host");
    }
    path = url  + req.file.path;
  }


  cryptoObj.updater = req.userData.userId;
  if (path) {
    cryptoObj.image = path;
  }

  // console.log (cryptoObj);
  const crypto = new Crypto(cryptoObj);
  Crypto.updateOne({ _id: req.params.id }, crypto)
    .then((result) => {
      if (result.n > 0) {
        res.status(200).json({ message: "Update successful!", crypto: crypto });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Couldn't update crypto! " + error,
      });
    });
});


router.get("/list", async (req, res, next) => {
 const apiKey = cryptoTokens.APIKEY;
 const URL = cryptoTokens.URL;
 const latest = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';
 const info = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/info';
  let limit = req.query.limit
  if (!limit) {
    limit = 500 + ''
  }
  try {
    const requestOptions = {
      method: 'GET',
      uri: latest,
      qs: {
        'start': '1',
        'limit': limit,
        'convert': 'USD'
      },
      headers: {
        'X-CMC_PRO_API_KEY': apiKey
      },
      json: true,
      gzip: true
    };

    const requestOptions2 = {
      method: 'GET',
      uri: info,
      qs: {
        'start': '1',
        'limit': limit,
        'convert': 'USD'
      },
      headers: {
        'X-CMC_PRO_API_KEY': apiKey
      },
      json: true,
      gzip: true
    };
    // const infoResponse = await rp(requestOptions2);
    // console.log( infoResponse[1], 'API call info:' );

    const resp = await rp(requestOptions);

    if (resp) {
      console.log('API call response:', resp);
      return res.status(200).json({response: resp})
    }

    if (!resp) {
      console.log('API call error:', 'Error');
      return res.status(500).json({message: 'Error'})
    }
    
    // rp(requestOptions).then(response => {
    //   console.log('API call response:', response);
    //   res.status(200).json({response})
    // }).catch((err) => {
    //   console.log('API call error:', err.message);
    //   res.status(500).json({message: err.message })
    // });
    
  } catch (err) {
    return res.status(500).json({
      message: "Error in crypto block " + err,
    });
  }
});

router.get("/binance", async (req, res, next) => {
  const apiKey = binance.APIKEY;
  const apiSecret = binance.APISECRET;
  const URL = "https://api.binance.com";
  const histEndPoint = "/api/v3/historicalTrades";
  const aggTradeListEndPoint = "/api/v3/aggTrades";

  // GET /sapi/v1/accountSnapshot (HMAC SHA256) daily account snapshot

   let limit = req.query.limit
   if (!limit) {
     limit = 200 + ''
   }
   try {
     const requestOptions = {
       method: 'GET',
       uri: URL,
       qs: {
         'start': '1',
         'limit': limit,
         'convert': 'USD'
       },
       headers: {
         'X-CMC_PRO_API_KEY': apiKey
       },
       json: true,
       gzip: true
     };
     
     rp(requestOptions).then(response => {
       console.log('API call response:', response);
       res.status(200).json({response})
     }).catch((err) => {
       console.log('API call error:', err.message);
       res.status(500).json({message: err.message })
     });
     
   } catch (err) {
     return res.status(500).json({
       message: "Error in binance block ",
     });
   }
 });



router.delete("/:id", checkAuth, async (req, res, next) => {
  if (!req.params.id) return res.status(401).json({ error: "empty id" });
  const alloweds = process.env.DIRECTORS;

  if (!alloweds.includes(req.userData.email)) {
    logIncident(req.userData.email, "Not allowed to delete Crypto");
    return res.status(500).json({ message: "Not allowed" });
  }

  Crypto.deleteOne({ _id: req.params.id })
    .then((result) => {
      if (result.n > 0) {
        res.status(200).json({ message: "Deletion successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        message: "Deleting Data failed!",
      });
    });
});

module.exports = router;
