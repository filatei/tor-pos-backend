const Claim = require("../models/claim");
const Customer = require("../models/customer");
const path = require('path')
const fs = require('fs');
var moment = require('moment');
var sanitize = require('mongo-sanitize');


// const readXlsxFile = require('read-excel-file/node');
 
exports.importClaim =  (req, res, next) => {
  let claimsArr = req.body;
  let userid = req.userData.userId;
  
  
  // unique customer names  .. not used
  function uniqcust(array) {
    const key = 'name';
    const arrayUniqueByKey = [...new Map(array.map(item =>
      [item[key], item])).values()];
    return arrayUniqueByKey;
  }

  // newClaimsArr =  claimsArr.map(fixClaim)
  // let custArr = claimsArr.map(cl => {
  //                 return {name: cl.customer}
  //               })
  // let  uniquecustarr = uniqcust(custArr)
  // insert into customer collection
  // Customer.collection.insertMany(uniquecustarr, {ordered: true})
  // .then(result => {
  //   console.log('insertcount', result.insertedCount)
  //   res.status(200).json({message: 'customers insertered ' +result.insertedCount })
  // })
  // .catch(err => {
  //   // console.error(err)

  //   throw err
  // })
  // create claims with unique stan

  claimsArr.forEach(claim => {
    // customerID = Customer.findOneAndUpdate({name: claim.customer})
    claim.stan = claim.stan + ''
    let customerID;

    let customerName = claim.customer.trim()
    Customer.findOne({name: new RegExp('^'+customerName+'$', "i")}, function(err, cust) {

      if (err) {
        console.log (err)
        // throw err
      }
      if (!cust) {
        // create customer and
        customer = new Customer({name: customerName})
        
        return customer.save()
        .then(result => {
          console.log('customer created')
          customerID = result._id;
          
        })
        .then (ress => {
          customerID = ress._id;
        })
        .catch(err => {
          console.log(err)
        })
        
      }
      if (cust) {
        // save claim
        customerID = cust._id
      }
      // save claim
      let nc = {
        creator: userid,
        customer: customerID,
        acquirer: claim.acquirer,
        stan: (claim.stan != null && claim.stan.indexOf('.jpg') > -1)? claim.stan.replace('.jpg',""):claim.stan,
        txn_amount: claim.txn_amount,
        status: claim.status,
        remarks: claim.remarks,
        action_taken: claim.action_taken,
        trans_id: claim.trans_id,
        log_code: claim.log_code,
        trans_date:  claim.trans_date? new Date((claim.trans_date - (25567 + 2)) * 86400 * 1000): null,
        expiry_date: claim.expiry_date?  new Date((claim.expiry_date - (25567 + 2)) * 86400 * 1000): null,
        received_date: claim.received_date?  new Date((claim.received_date - (25567 + 2)) * 86400 * 1000):null,
        reply_date: claim.reply_date?  new Date((claim.reply_date - (25567 + 2)) * 86400 * 1000):null,
        company: claim.company,
        terminal_location: claim.terminal_location,
        terminal_id: claim.terminal_id,
        card_number: claim.card_number,
        card_bank: claim.card_bank,
        avatar: (claim.stan.indexOf('.jpg') > -1)? claim.stan: claim.stan.concat('.jpg'),
      }
      let newClaimObj = new Claim(nc);
      newClaimObj.save()
      .then( result => {
        console.log('claim saved', result.card_number)
        // res.status(201).jsom({message: 'claim saved'})
      })
      .catch(err => {
        // res.status(500).json ({error: ' claim save failed' + err})
        console.error(err)
      })
    });
  })
  res.status(201).json({message: "Claims Imported"})
  
}
 
exports.createClaim =  (req, res, next) => {
  let claimObj = req.body;
  // console.log('reqbody', claimObj)
  // userData was added to checkAuth middleware and passed along
  // console.log('userdata in claim ', req.userData.userId)

  claimObj.creator = req.userData.userId;
  claimObj.avatar = claimObj.stan + '.jpg'

  if (claimObj.customer._id){
    console.log( 'customer may already be in db')
    // store customer id and save claim
    claimObj.customer = claimObj.customer._id;
    saveClaim(claimObj);
  } else {
    console.log( 'customer may not  be in db')
    // store customer name and return _id,  before save claim
    saveCustomer(claimObj.customer);
  }

  /**
   * saves customer cust to customer collection if not exist already
   * and sets claimObj.customer to savedcustomer._id
   * @param {*} cust 
   */
  function saveCustomer( cust ) {
    Customer.findOne({name: new RegExp('^'+cust.name+'$', "i")})
    .then( (result) => {
      if (result) {
        console.log(result, ' cust find result')
        claimObj.customer = result._id
        saveClaim(claimObj)
      } else {
        let custObj = new Customer(cust);
        console.log(custObj, ' new customer obj')
        custObj.save()
        .then((sres) => {
          claimObj.customer = sres._id;
          console.log(claimObj, ' claimobj in customerloop')
          saveClaim(claimObj)
        })
        .catch(err => {
          console.log(err, ' customer save err')
          // throw err
        })
      }
    })
    .catch( (err) => {
      console.log (err, 'customer find  find err')
      // throw err
    })
  }

  function saveClaim(claimobj) {
    claim = new Claim(claimobj);
    console.log('claim new ', claim)
    claim.save()
    .then(result => {
      res.status(201).json({
        message: "Creating  claim succeeded!" + result
      });
    })
    .catch(error => {
      console.error(error )
      res.status(500).json({
        message: "Creating a claim failed! " + error 
      });
    }); 
  }

}
 
exports.getClaims = (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const dateBegin = req.query.datebegin;
  const dateEnd = req.query.dateend;
  const currentPage = +req.query.page;
  const claimQuery = Claim.find().sort({ updatedAt:-1 }).populate('customer');
  let fetchedClaims;
  if (pageSize && currentPage) {
    claimQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  claimQuery

    .then(documents => {
      // console.log(documents[0])
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
  // console.log(req.params.id)
  if (!req.params.id || req.params.id == undefined) return;
  Claim.
    findById(req.params.id).
    populate('customer').
    exec(function (err, claim) {
      // if (err) return handleError(err);
      if (err)  {
        return res.status(500).json({
          message: "Error finding claim " + err
        });
      }
    
      if (claim) {
        // let nc = JSON.parse(JSON.stringify(claim))
        // nc.customer = claim.customer.name;
        // console.log(nc)
        // console.log('The customer is now %s', nc.customer);
        res.status(200).json(claim);
      } else {
        res.status(404).json({ message: "claim not found!" });
      }
    });
}

exports.deleteClaim = (req, res, next) => {
  // console.log('params ', req.params)
  Claim.deleteOne({ _id: req.params.id }).then(result => {
    console.error('claim deleted ', result)
    if (result.n == 1 && result.deletedCount == 1) {
      console.log(' claim deleted :', result.deletedCount)
      return res.status(200).json({ message: "Claim deleted! " + result });
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
  claimObj._id = sanitize(req.params.id);

  // userData  was added to checkAuth middleware and passed along
  claimObj.updater = req.userData.userId; 

  if (claimObj.customer._id){
    console.log( 'customer  already be in db')
    // store customer id and save claim
    claimObj.customer = claimObj.customer._id;
    saveClaim(claimObj);
  } else {
    console.log( 'customer may not  be in db')
    // store customer name and return _id,  before save claim
    saveCustomer(claimObj.customer);
  }

   /**
   * saves customer cust to customer collection if not exist already
   * and sets claimObj.customer to savedcustomer._id
   * @param {*} cust 
   */
  function saveCustomer( cust ) {
    Customer.findOne({name: new RegExp('^'+cust.name+'$', "i")})
    .then( (result) => {
      if (result) {
        console.log(result, ' cust find result')
        claimObj.customer = result._id
        saveClaim(claimObj)
      } else {
        let custObj = new Customer(cust);
        console.log(custObj, ' new customer obj')
        custObj.save()
        .then((sres) => {
          claimObj.customer = sres._id;
          console.log(claimObj, ' claimobj in customerloop')
          saveClaim(claimObj)
        })
        .catch(err => {
          console.log(err, ' customer save err')
          // throw err
        })
      }
    })
    .catch( (err) => {
      console.log (err, 'customer find  find err')
      // throw err
    })
  }

  function saveClaim(claimobj) {
    claim = new Claim(claimobj);
    Claim.updateOne({ _id: req.params.id }, claim)
    .then(result => {
      if (result.n > 0) {
        res.status(200).json({ message: "Update successful!" });
      } else {
        res.status(401).json({ message: "Not authorized!" });
      }
    })
    .catch(error => {
      console.log(error)
      res.status(500).json({
        message: "Couldn't udpate claim! " + error
      });
    });
  }

}