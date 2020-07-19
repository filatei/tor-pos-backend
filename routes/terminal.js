require('dotenv').config();
const express = require("express");
const Terminal = require("../models/terminal");
const router = express.Router();
const checkAuth = require('../middleware/check-auth');

router.get('',(req, res, next) => {
  const pageSize = +req.query.pagesize ;
  const currentPage = +req.query.currentpage;
  const sort = req.query.sort;

  let terminalQuery = Terminal.find();
  if (pageSize && currentPage) {
    terminalQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  
  terminalQuery
    .then(documents => {
      res.status(200).json({
        terminals: documents
      });
    })
    .catch(error => {
      res.status(500).json({
        message: "Fetching terminals failed! " + error
      });
    });
});

router.get("/:id",  (req, res, next) => {
  // console.log('id ', req.params.id)
  // console.log(req.userData.userId)
  Terminal.findById(req.params.id)
  .then(terminal => {
    if (terminal) {
      // console.log(terminal)
      res.status(200).json({terminal: terminal});
    } else {
      res.status(404).json({ message: "terminal not found!" });
    }
  })
  .catch(error => {
    res.status(500).json({
      message: "Fetching terminal failed!"
    });
  });
});

router.post("", checkAuth, (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
    return res.status(500).json({message: 'Not allowed'});
  }
  let terminalObj = req.body;

  if ( terminalObj && terminalObj.holder ) {
    terminalObj.holder = terminalObj.holder.toUpperCase();
  }
  terminalObj.creator = req.userData.userId;

  const terminal = new Terminal(terminalObj);
  //  console.log(terminal);
  terminal.save().then ((result)=> {
    // console.log(result)
    res.status(201).json({
      message: "Terminal added successfully",
      terminal: {
        ...result,
        id: result._id
      }
    });
  })
  .catch(error => {
    res.status(500).json({
      message: "creating terminals failed! " + error
    });
  });
});
  
router.put("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
    return res.status(500).json({message: 'Not allowed'});
  }
  
  let terminalObj = req.body;
  terminalObj._id = req.params.id;
  terminalObj.updater = req.userData.userId; 
  const terminal = new Terminal(terminalObj);

  Terminal.updateOne({ _id: req.params.id }, terminal)
  .then(result => {
    if (result.n > 0) {
      res.status(200).json({ message: "Update successful!" });
    } else {
      res.status(401).json({ message: "Not authorized!" });
    }
  })
  .catch(error => {
    res.status(500).json({
      message: "Couldn't update terminal! " + error
    });
  });
});

router.delete("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.DELALLOWEDST;
  if ( !alloweds.includes(req.userData.email)) {
    return res.status(500).json({message: 'Not allowed'});
  }

  Terminal.deleteOne({ _id: req.params.id })
    .then(result => {
      if (result.n > 0) {
        console.log('term deleted', req.params.id)
        res.status(200).json({ message: "Deletion successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
      })
    .catch(error => {
    res.status(500).json({
      message: "Deleting terminal failed! " + error
    });
  });
});

module.exports = router;
