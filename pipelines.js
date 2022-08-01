/*
 * Requires the MongoDB Node.js Driver
 * https://mongodb.github.io/node-mongodb-native
 */

const agg = [
    {
      '$unwind': {
        'path': '$products'
      }
    }, {
      '$group': {
        '_id': {
          'productName': '$products.name', 
          'site': '$site', 
          'date': '$trans_date'
        }, 
        'sales': {
          '$sum': '$paidAmount'
        }, 
        'qty': {
          '$sum': '$products.qty'
        }
      }
    }
  ];
  
  MongoClient.connect(
    '',
    { useNewUrlParser: true, useUnifiedTopology: true },
    function(connectErr, client) {
      assert.equal(null, connectErr);
      const coll = client.db('').collection('');
      coll.aggregate(agg, (cmdErr, result) => {
        assert.equal(null, cmdErr);
      });
      client.close();
    });

    // generic Pipeline
    const pipeline = [
      {
        $unwind: {
          path: "$products",
        },
      },
      {
        $match: {
          "products.name": { $ne: "INCENTIVE" },
          paymentMethod: { $ne: "INCENTIVE" },
          orderType: { $eq: "NORMAL" },
        },
      },
      {
        $group: {
          _id: {
            productName: "$products.name",
            site: "$site",
            day: { $dayOfMonth: "$trans_date" },
            month: { $month: "$trans_date" },
            year: { $year: "$trans_date" },
          },
          totalQty: { $sum: "$products.qty" },
          totalSales: { $sum: "$paidAmount" },
        },
      },
      {
        $sort: {
          "_id.day": -1,
          "_id.month": -1,
          "_id.year": -1,
          "_id.site": 1,
        },
      },
      {
        $project: {
          _id: 0,
          totalQty: 1,
          totalSales: 1,
          site: { $concat: [{ $toString: "$_id.site" }] },
          dayMonthYr: {
            $concat: [
              { $toString: "$_id.day" },
              "-",
              { $toString: "$_id.month" },
              "-",
              { $toString: "$_id.year" },
            ],
          },
        },
      },
      {
        $merge: {
          into: "ordersDailyBucket",
          on: "dayMonthYr",

          whenMatched: "replace",
          whenNotMatched: "insert",
        },
      },
    ];



    exports = async function (arg) {
      try {
        const collection = context.services
          .get("mongodb-atlas")
          .db("fido_db")
          .collection("payrolls");
        console.log(JSON.stringify(collection), "coll");

        const pipeline = [
          {
            $project: {
              netPay: 1,
              payee: 1,
              year: 1,
              month: 1,
              status: 1,
              payType: 1,
              createdAt: 1,
              site: 1,
              payroll_id: 1,
              monthYr: {
                $concat: [{ $toString: "$month" }, "-", { $toString: "$year" }],
              },
            },
          },
          {
            $lookup: {
              from: "peoples",
              localField: "payee",
              foreignField: "_id",
              as: "payee2",
            },
          },
          {
            $lookup: {
              from: "sites",
              localField: "site",
              foreignField: "_id",
              as: "site2",
            },
          },
          {
            $unwind: {
              path: "$payee2",
            },
          },
          {
            $unwind: {
              path: "$site2",
            },
          },
          {
            $group: {
              _id: {
                year: "$year",
                month: "$month",
                payType: "$payType",
                status: "$status",
                createdAt: "$createdAt",
                payee: "$payee2.name",
                jobName: "$payee2.jobName",
                bankAccount: "$payee2.bankAccount",
                netPay: "$netPay",
                monthYr: "$monthYr",
                site: "$site2.name",
              },
            },
          },
          {
            $project: {
              _id: 1,
              payee: { $concat: [{ $toString: "$_id.payee" }] },
              netPay: { $concat: [{ $toString: "$_id.netPay" }] },
              site: { $concat: [{ $toString: "$_id.site" }] },
              payType: { $concat: [{ $toString: "$_id.payType" }] },
              jobName: { $concat: [{ $toString: "$_id.jobName" }] },
              year: { $concat: [{ $toString: "$_id.year" }] },
              month: { $concat: [{ $toString: "$_id.month" }] },
              status: { $concat: [{ $toString: "$_id.status" }] },
              bankAccount: { $concat: [{ $toString: "$_id.bankAccount" }] },
            },
          },
          {
            $merge: {
              into: "payrollgrpbyyrmonthstatus",
              on: "_id",
              whenMatched: "update",
              whenNotMatched: "insert",
            },
          },
        ];

        const agg = await collection.aggregate(pipeline);
        console.log(JSON.stringify(agg));
      } catch (err) {
        console.log(err);
      }
    };