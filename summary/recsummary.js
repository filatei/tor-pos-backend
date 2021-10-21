const Recupload = require("../models/recupload");
const Produce = require("../models/produce");

const recAgg = async () => {
  const summary = await Recupload.aggregate([
    // {
    //   $match: {
    //     action_taken: "PRODUCT RELEASED",
    //   },
    // },
    {
      $unwind: "$products",
    },

    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          // bank: { $toUpper: "$acquirer" },
          product: "$products.name",
          // company: { $toUpper: "$company" },
          action: "$action_taken",
        },
        totalSalesAmount: {
          $sum: "$txn_amount",
        },
      },
    },

    {
      $project: {
        "_id.year": 1,
        // "_id.bank": 1,
        "_id.product": 1,
        // "_id.company": 1,
        "_id.action": 1,

        totalSalesAmount: 1,
      },
    },

    {
      $sort: {
        // "_id.bank": 1,
        "_id.product": 1,
        // "_id.company": 1,
        "_id.year": -1,
      },
    },
  ]);
  // console.log(summary);

  return summary;
};

async function totalSalesForMonthYrFDW(mnth, yr, comp) {
  // monthn(1-31) and year(1-12) to be numbers and comp string
  console.log(mnth, yr, "mnth yr");
  const aggPipeline = await Recupload.aggregate([
    {
      $match: {
        action_taken: "PRODUCT RELEASED",
        company: { $ne: "FIDO FLUIDS" },
        pay_type: { $ne: "Incentive" },
        acquirer: { $in: ["GTBANK", "ACCESS", "STANBIC", "FCMB"] },
      },
    },
    {
      $group: {
        //  _id: { month: { $month: "$createdAt"}, year: { $year: "$createdAt" } , bank: "$acquirer", company: "$company", paytype: "$pay_type"},
        _id: {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
        },
        totalAmount: { $sum: "$txn_amount" },
        count: { $sum: 1 },
      },
    },
    { $match: { "_id.month": 9, "_id.year": 2021 } },
  ]);
  console.log(aggPipeline, "aggpipe");
  return aggPipeline;
}

async function Pipeline(start, end) {
  const pipeline = [
    {
      $match: {
        action_taken: "PRODUCT RELEASED",
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $unwind: {
        path: "$products",
      },
    },
    {
      $group: {
        _id: {
          year: {
            $year: "$createdAt",
          },
          month: {
            $month: "$createdAt",
          },
          day: {
            $dayOfMonth: "$createdAt",
          },
          product: "$products.name",
          site: "$terminal_location",
        },
        totalSalesAmount: {
          $sum: "$txn_amount",
        },
        totalQty: {
          $sum: "$products.qty",
        },
      },
    },
    {
      $sort: {
        "_id.year": -1,
        "_id.month": -1,
        "_id.day": -1,
        "_id.product": 1,
        totalQty: -1,
        "_id.site": 1,
      },
    },
  ];

  // return pipeline;
  const summary = await Recupload.aggregate(pipeline);
  // console.log(summary, "summary ");
  return summary;
}

async function producePipeline(start, end) {
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
      },
    },
    // {
    //   $unwind: {
    //     path: "$product",
    //     path: "$site",
    //   },
    // },
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "products",
      },
    },
    {
      $lookup: {
        from: "sites",
        localField: "site",
        foreignField: "_id",
        as: "sites",
      },
    },
    {
      $unwind: "$products",
    },
    {
      $unwind: "$sites",
    },

    {
      $group: {
        _id: {
          year: {
            $year: "$dateProduced",
          },
          month: {
            $month: "$dateProduced",
          },
          day: {
            $dayOfMonth: "$dateProduced",
          },
          product: "$products.name",
          site: "$sites.name",
        },
        totalQty: {
          $sum: "$qty",
        },
        totalCement: {
          $sum: "$cementbags",
        },
        totalSand: {
          $sum: "$sand",
        },
      },
    },

    {
      $sort: {
        "_id.year": -1,
        "_id.month": -1,
        "_id.day": -1,
        "_id.site": 1,
        "_id.product": 1,
        totalQty: -1,
      },
    },

    {
      $project: {
        _id: 1,
        site: 1,
        product: 1,
        totalQty: 1,
        totalCement: 1,
      },
    },
  ];

  const summary = await Produce.aggregate(pipeline);
  // console.log(summary, "summary ");
  return summary;
}

module.exports = { recAgg, Pipeline, producePipeline, totalSalesForMonthYrFDW };
