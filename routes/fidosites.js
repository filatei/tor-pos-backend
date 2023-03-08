require('dotenv').config();
const express = require("express");
const Site = require("../models/fidosite");
const router = express.Router();
const checkAuth = require('../middleware/check-auth');

router.get('',(req, res, next) => {
  const pageSize = +req.query.pagesize ;
  const currentPage = +req.query.currentpage;
  const sort = req.query.sort;

  let siteQuery = Site.find();
  if (pageSize && currentPage) {
    siteQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  
  siteQuery
    .then(documents => {
      res.status(200).json({
        sites: documents
      });
    })
    .catch(error => {
      res.status(500).json({
        message: "Fetching sites failed! " + error
      });
    });
});

router.get("/:id",  (req, res, next) => {
  // console.log('id ', req.params.id)
  // console.log(req.userData.userId)
  Site.findById(req.params.id)
  .then(site => {
    if (site) {
      // console.log(site)
      res.status(200).json({site: site});
    } else {
      res.status(404).json({ message: "site not found!" });
    }
  })
  .catch(error => {
    res.status(500).json({
      message: "Fetching site failed!"
    });
  });
});

router.post("", checkAuth, (req, res, next) => {
  const alloweds = ['ADMIN', 'GENERAL MANAGER'];

  if ( !alloweds.includes(req.userData.role)) {
    return res.status(500).json({message: 'Not allowed'});
  }
  let siteObj = req.body;
  console.log(siteObj, 'site')
  if (siteObj.sitename) {
    siteObj.name = siteObj.sitename;
  }

 
  siteObj.creator = req.userData.userId;

  const site = new Site(siteObj);
   console.log(site);
  site.save().then ((result)=> {
    // console.log(result)
    res.status(201).json({
      message: "Site added successfully",
      site: {
        ...result,
        id: result._id
      }
    });
  })
  .catch(error => {
    console.log(error)
    res.status(500).json({
      message: "creating sites failed! " + error
    });
  });
});
  
router.put("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
    return res.status(500).json({message: 'Not allowed'});
  }
  
  let siteObj = req.body;
  siteObj._id = req.params.id;
  siteObj.updater = req.userData.userId; 
  const site = new Site(siteObj);

  Site.updateOne({ _id: req.params.id }, site)
  .then(result => {
    if (result.n > 0) {
      res.status(200).json({ message: "Update successful!" });
    } else {
      res.status(401).json({ message: "Not authorized!" });
    }
  })
  .catch(error => {
    res.status(500).json({
      message: "Couldn't update site! " + error
    });
  });
});

router.delete("/:id", (req, res, next) => {
  const alloweds = process.env.DELALLOWEDS;
  if ( !alloweds.includes(req.userData.email)) {
    return res.status(500).json({message: 'Not allowed'});
  }

  Site.deleteOne({ _id: req.params.id })
    .then(result => {
      if (result.n > 0) {
        res.status(200).json({ message: "Deletion successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
      })
    .catch(error => {
    res.status(500).json({
      message: "Deleting site failed! " + error
    });
  });
});

module.exports = router;
