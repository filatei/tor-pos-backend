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

module.exports = { recAgg };
