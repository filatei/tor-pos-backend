const Claim = require("../models/claim");
const path = require('path')
const fs = require('fs');
const readXlsxFile = require('read-excel-file/node');
 


exports.importClaim =  (req, res, next) => {
  // console.log(req)
  let claimObj = req.body;
   // zawsw console.log('claimObj ',req)
    // userData was added to checkAuth middleware and passed along
    // console.log('userdata in claim ', req.userData)
   // claimObj.creator = req.userData.userId;

    for (k=0; k< claimObj.length; k++) {
      //  console.log(k)
      
      el = claimObj[k];
  
      try {
        el.trans_date_time =  new Date((el.trans_date_time - (25567 + 2))*86400*1000); 
        el.reply_mail =  new Date((el.reply_mail - (25567 + 2 ))*86400*1000); 
        el.received_from_bank =  new Date((el.received_from_bank - (25567 + 2))*86400*1000); 
      } catch (err) {
      // console.log (err + i)
        continue
      }
  
      let claim = new Claim(el);
      // console.log(i, el)
      claim.save()
      .then(result => {
      // console.log(i, result)
        
      })
      .catch(error => {
        console.error(error )
        res.status(500).json({
          message: "Creating an claim failed!" + error 
        });
      });
      
    };
     
    res.status(201).json({
      message: " All Claim Imported successfully: " 
    });
 }

exports.createClaim =  (req, res, next) => {
// console.log(req)
let claimObj = req.body;
  // userData was added to checkAuth middleware and passed along
  // console.log('userdata in claim ', req.userData)
  // claimObj.creator = req.userData.userId;

  console.log(claimObj)
  
  let claim = new Claim(claimObj);
  
  claim.save()
  .then(result => {
    console.log(result)
    return res.status(201).json({
      message: "  Claim Imported successfully: " 
    });
    
  })
  .catch(error => {
    console.error(error )
    return res.status(500).json({
      message: "Creating a claim failed! " + error 
    });
  });

}
 
  exports.getClaims = (req, res, next) => {
    const pageSize = +req.query.pagesize;
    // console.log(pageSize, 'pageSize')
    const dateBegin = req.query.datebegin;
    const dateEnd = req.query.dateend;
    const currentPage = +req.query.page;
    const claimQuery = Claim.find();
    let fetchedClaims;
    if (pageSize && currentPage) {
      claimQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
    }
    claimQuery
      .then(documents => {
        res.status(200).json({
          message: "claims fetched successfully!",
          claims: documents,
          total_count: documents.length
          
        });
      })
      .catch(error => {
        res.status(500).json({
          message: "Fetching claims failed!"
        });
      });
   }

   exports.getClaim = (req, res, next) => {
     console.log(req.params.id)
    Claim.findById(req.params.id).then(claim => {
      if (claim) {
        res.status(200).json(claim);
      } else {
        res.status(404).json({ message: "claim not found!" });
      }
    })
    .catch(error => {
      res.status(500).json({
        message: "Fetching claim failed!"
      });
    });
  }

  exports.deleteClaim = (req, res, next) => {
   // console.log('params ', req.params)
    Claim.deleteOne({ _id: req.params.id }).then(result => {
      console.error('claim delete ', result)
      if (result.n == 1 && result.deletedCount == 1){
        console.log(' claim deleted :', result.deletedCount)
       return res.status(200).json({ message: "Claim deleted!" });
      }
      else {
       return res.status(401).json({ message: "Not Authorised!" });
      }
    })
    .catch(error => {
        return res.status(500).json({
        message: "Deleting claim failed! - " + error
        });
    });
}

exports.updateClaim =  (req, res, next) => {
  let claimObj = req.body;
  claimObj._id = req.params.id;
  // userData  was added to checkAuth middleware and passed along
  claimObj.updater = req.userData.userId; 
  const claim = new Claim(claimObj);
  
  Claim.updateOne({ _id: req.params.id, creator: req.userData.userId }, claim)
  .then(result => {
    if (result.n > 0) {
      res.status(200).json({ message: "Update successful!" });
    } else {
      res.status(401).json({ message: "Not authorized!" });
    }
  })
  .catch(error => {
    res.status(500).json({
      message: "Couldn't udpate claim!"
    });
  });
}

  // exports.uploadClaim =  (req, res, next) => {
  //   let claimObj = req.body;
  //   const file = req.file
  //   // File path.
  //   readXlsxFile(file).then((rows) => {
  //     // `rows` is an array of rows
  //     // each row being an array of cells.
  //   })
  //   claimObj.creator = req.userData.userId; 
  //   const claim = new Claim(claimObj);
  //   // console.log('claim ', claim);
  //     claim.save()
  //     .then(result => {
  //       res.status(201).json({
  //         message: "Claim added successfully",
  //         claim: {
  //           ...result,
  //           id: result._id
  //         }
  //       });
  //     })
  //     .catch(error => {
  //       res.status(500).json({
  //         message: "Creating an claim failed!"
  //       });
  //     });
  // }

