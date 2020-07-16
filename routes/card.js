require('dotenv').config();
const express = require("express");
const Card = require("../models/card");
const router = express.Router();
const checkAuth = require('../middleware/check-auth');



router.get('',(req, res, next) => {
  const pageSize = +req.query.pagesize ;
  const currentPage = +req.query.currentpage;
  const sort = req.query.sort;

  let cardQuery = Card.find();
  if (pageSize && currentPage) {
    cardQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }

  
  let fetchedCards;
  
  cardQuery
    .then(documents => {
      fetchedCards = documents;
      res.status(200).json({
        message: "Cards fetched successfully!",
        cards: documents,
      });
    })
    .catch(error => {
      res.status(500).json({
        message: "Fetching cards failed! " + error
      });
    });
});

router.get("/:id",  (req, res, next) => {
  // console.log('id ', req.params.id)
  // console.log(req.userData.userId)
  Card.findById(req.params.id)
  .then(card => {
    if (card) {
      // console.log(card)
      res.status(200).json({card: card});
    } else {
      res.status(404).json({ message: "card not found!" });
    }
  })
  .catch(error => {
    res.status(500).json({
      message: "Fetching card failed!"
    });
  });
});

router.post("", checkAuth, (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
    return res.status(500).json({message: 'Not allowed'});
  }
  let cardObj = req.body;


  if ( cardObj && cardObj.holder ) {
    cardObj.holder = cardObj.holder.toUpperCase();
  }
  cardObj.creator = req.userData.userId;


  const card = new Card(cardObj);
  //  console.log(card);
  card.save().then ((result)=> {
    // console.log(result)
    res.status(201).json({
      message: "Card added successfully",
      card: {
        ...result,
        id: result._id
      }
    });
  })
  .catch(error => {
    res.status(500).json({
      message: "creating cards failed! " + error
    });
  });
});
  
router.put("/:id", checkAuth, (req, res, next) => {
  const alloweds = process.env.ALLOWEDS;

  if ( !alloweds.includes(req.userData.email)) {
    return res.status(500).json({message: 'Not allowed'});
  }
  
  let cardObj = req.body;
  cardObj._id = req.params.id;
  cardObj.updater = req.userData.userId; 
  const card = new Card(cardObj);

  Card.updateOne({ _id: req.params.id }, card)
  .then(result => {
    if (result.n > 0) {
      res.status(200).json({ message: "Update successful!" });
    } else {
      res.status(401).json({ message: "Not authorized!" });
    }
  })
  .catch(error => {
    res.status(500).json({
      message: "Couldn't udpate card! " + error
    });
  });
});

router.delete("/:id", (req, res, next) => {
  const alloweds = ['filatei@torama.ng'];  
  if ( !alloweds.includes(req.userData.email)) {
    return res.status(500).json({message: 'Not allowed'});
  }

  Card.deleteOne({ _id: req.params.id })
    .then(result => {
      if (result.n > 0) {
        res.status(200).json({ message: "Deletion successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
      })
    .catch(error => {
    res.status(500).json({
      message: "Deleting card failed!"
    });
  });
});

router.post("/import", checkAuth, (req, res, next) => {
  const alloweds = ['filatei@torama.ng']  
  if ( !alloweds.includes(req.userData.email)) {
    return res.status(500).json({message: 'Not allowed'});
  }
// exports.importClaim =  (req, res, next) => {
  // console.log(req)
  let cardArr = req.body;  // array of card objs
   // zawsw console.log('claimObj ',req)
    // userData was added to checkAuth middleware and passed along
    // console.log('userdata in claim ', req.userData)
   
  // unique card names
  function uniqcard(array) {
    const key = 'name';
    const arrayUniqueByKey = [...new Map(array.map(item =>
      [item[key], item])).values()];

    return arrayUniqueByKey;
  }

  let uniqcards = uniqcard(cardArr)
  Card.collection.insertMany(uniqcards, {ordered: true})
  .then(result => {
    // console.log('insertcount', result.insertedCount)
    res.status(200).json({message: 'cards insertered ' + result.insertedCount })
  })
  .catch(err => {
    // console.error(err)
    res.status(500).json({
      message: "Creating  cards failed!" + err
    });
    
    throw err
  })


})



module.exports = router;
