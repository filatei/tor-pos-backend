exports = async function(arg){
 
    // create a daily bucket of orders per site for each product
      
  
      // Accessing a mongodb service:
      const collection = context.services.get("mongodb-atlas").db("fido_db").collection("fidoorders");
      let today = new Date().toLocaleDateString('en-GB', {timeZone: 'Europe/London', dateStyle: 'short',
          year: 'numeric', timeZoneName: 'short',
          month: '2-digit',
          day: '2-digit',});
          
        // today = '2022-08-06';
        const day = new Date().getDate();
        const month = new Date().getMonth()+1;
        const year = new Date().getFullYear();
      
      let formattedDate = today.replace(/\//g,'-');
      formattedDate = day+'-'+month+'-'+year
     const tomorrow = (day+1) + '-' + month + '-' + year;
     
      // const startDate = formattedDate+'T00:00:00Z';
      // const endDate = formattedDate+'T23:00:00Z';
      const startDate = formattedDate;
      const endDate = tomorrow;
      
      console.log(startDate, endDate,  'formattedDate', tomorrow) 
     
    // pipeline pw to sum today's totals per product
    const pipelinePw = [
    {
      '$match': {
        'createdAt': {
          '$gte': {
            '$date': startDate
          }, 
          '$lt': {
            '$date': endDate
          }
        }, 
        'products.name': {
          '$nin': [
            null, '', 'INCENTIVE'
          ]
        }, 
        'paymentMethod': {
          '$nin': [
            null, '', 'INCENTIVE'
          ]
        }, 
        'orderType': {
          '$nin': [
            null, '', 'INCENTIVE'
          ]
        }
      }
    }, {
      '$unwind': {
        'path': '$products'
      }
    }, {
      '$group': {
        '_id': {
          'product': '$products.name'
        }, 
        'productQty': {
          '$sum': '$products.qty'
        }
      }
    }, {
      '$project': {
        '_id': 1, 
        'product': '$_id.product', 
        'productQty': 1
      }
    }, {
      '$project': {
        'product': '$product', 
        'value': '$productQty', 
        '_id': 1
      }
    }, {
      '$addFields': {
        '__agg_sum': {
          '$sum': [
            '$value'
          ]
        }
      }
    }, {
      '$sort': {
        '__agg_sum': -1
      }
    }, {
      '$project': {
        '__agg_sum': 0
      }
    },
    {
          "$merge": {
            "into": "orderSummaryToday",
            "on": "_id",
  
            "whenMatched": "replace",
            "whenNotMatched": "insert",
          },
        },
  ];
      
          
      const agg = await collection.aggregate(pipelinePw);
      
      
      // insert agg into new collection called ordersDailyBucket
      // const collectionNew = context.services.get("mongodb-atlas").db("db1").collection("ordersDailyBucket");
      // const inserted = await collectionNew.insertMany(agg);
    
    
    return {result: agg};
  };