const Recupload = require("../models/recupload");
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
  console.log(summary);

  return summary;
};

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
        "_id.year": 1,
        "_id.site": 1,
        "_id.product": 1,
      },
    },
  ];

  // return pipeline;
  const summary = await Recupload.aggregate(pipeline);
  return summary;
}

module.exports = { recAgg, Pipeline };
