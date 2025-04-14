  db.recuploads.aggregate(

    [
      {
      $match: {
        company: "FIDO WATER",
        action_taken: "PRODUCT RELEASED",
       },
    },
      {
        $project:
          {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            Amount: {$sum: "$txn_amount"},
          }

      },

       { $match : { "month" : 7, "year": 2021 } }
    ]
  )


  db.recuploads.aggregate(
   [
     {
      $match: {
        
        action_taken: "PRODUCT RELEASED",
       },
    },
     {
       $group:
         {
           _id: { month: { $month: "$createdAt"}, year: { $year: "$createdAt" } , bank: "$acquirer", company: "$company", paytype: "$pay_type"},
           totalAmount: { $sum: "$txn_amount"  },
           count: { $sum: 1 }
         }
     },
     { $match : { "_id.month" : 9, "_id.year": 2021 , "_id.company": { "$ne" : "Fido Fluids"},  "_id.bank": { "$in": ["GTBANK", "ACCESS", "STANBIC",  "FCMB"] }}
 }
   ]
)

"_id.bank": {$in: ["GTBank", "Access", "Stanbic", "Fidelity", "FCMB"]}


[
  {
    '$unwind': {
      'path': '$products'
    }
  }, {
    '$lookup': {
      'from': 'customers', 
      'localField': 'customer', 
      'foreignField': '_id', 
      'as': 'customer'
    }
  }, {
    '$unwind': {
      'path': '$customer'
    }
  }, {
    '$group': {
      '_id': {
        'day': {
          '$dayOfMonth': '$createdAt'
        }, 
        'month': {
          '$month': '$createdAt'
        }, 
        'year': {
          '$year': '$createdAt'
        }, 
        'site': '$site', 
        'product': '$products.name', 
        'customer': '$customer.name'
      }, 
      'totalAmount': {
        '$sum': '$txn_amount'
      }, 
      'totalQty': {
        '$sum': '$products.qty'
      }, 
      'count': {
        '$sum': 1
      }
    }
  }, {
    '$sort': {
      '_id.year': 1, 
      '_id.month': -1, 
      '_id.day': -1, 
      'totalQty': -1
    }
  }, {
    '$project': {
      'site': '$_id.site', 
      'Prooduct': '$_id.product', 
      'customer': '$_id.customer', 
      'Qty': '$totalQty', 
      'Day': '$_id.day', 
      'Month': '$_id.month', 
      'Year': '$_id.year'
    }
  }
]

