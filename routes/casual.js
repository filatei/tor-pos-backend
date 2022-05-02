const express = require("express");
const Casual = require("../models/casual");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();


const checkAuth = require("../middleware/check-auth");


router.post("", checkAuth,   (req, res, next) => {
  
    let obj = req.body;
  
    obj.creator = req.userData.userId;
  
    const casual = new Casual(obj);
    casual.personDateType = casual.personId + casual.date+casual.type;
    console.log(casual, 'casual')
  
    casual
      .save()
      .then((result) => {
          console.log(result, 'result')
        res.status(201).json({
          message: "figures added successfully",
          casual: { ...result, id: result._id },
        });
      })
      .catch((error) => {
        res.status(500).json({
          message: "Creating a record failed! " + error,
        });
      });
  });

  router.put("/:id", checkAuth,  (req, res, next) => {
    
    let cObj = req.body;
   
    const updater = req.userData.userId;
    const id = req.params.id;
    cObj._id = req.params.id;
    cObj.updater = req.userData.userId;
    // const casual = new Casual(cObj);
      Casual.updateOne(
        { _id: req.params.id },
        cObj
      )
        .then((result) => {
          if (result.n > 0) {
            res.status(200).json({ message: "Update successful!" });
          } else {
            res.status(401).json({ message: "Not authorized!" });
          }
        })
        .catch((error) => {
          res.status(500).json({
            message: "Couldn't update product! " + error,
          });
        });
  });

  router.delete("/:id", checkAuth, (req, res, next) => {
    const alloweds = ['ADMIN'];
  
    if (!alloweds.includes(req.userData.role)) {
      logIncident(req.userData.email, "Not allowed to delete ");
      return res.status(500).json({ message: "Not allowed" });
    }
  
   
    Casual.deleteOne({ _id: req.params.id })
      .then((result) => {
        if (result.n > 0) {
            //  send mail
          
          res.status(200).json({ message: "Deletion successful!" });
        } else {
          res.status(401).json({ message: "Not authorized!" });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).json({
          message: "Deleting record failed! " + error,
        });
      });
  });

  router.get("", (req, res, next) => {
    const pageSize = +req.query.pagesize;
    const currentPage = +req.query.page;
    const cQuery = Casual.find().populate("personId").populate("siteId");
    let fetchedProducts;
    if (pageSize && currentPage) {
        cQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
    }
    cQuery
      .then((documents) => {
        res.status(200).json({
          message: "Record fetched successfully!",
          casuals: documents,
        });
      })
      .catch((error) => {
        res.status(500).json({
          message: "Fetching Records failed! " + error,
        });
      });
  });
  
  router.get("/:id", (req, res, next) => {
    Casual.findById(req.params.id)
      .populate("personId").populate('siteId')
      .then((casual) => {
        if (casual) {
          res.status(200).json(casual);
        } else {
          res.status(404).json({ message: "casual not found!" });
        }
      })
      .catch((error) => {
        res.status(500).json({
          message: "Fetching casual failed! " + error,
        });
      });
  });


module.exports = router;