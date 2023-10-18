const FidoOrder = require("../models/fidoorder");

exports.customerAggAcrossSites = async (props) => {
  const { startDate, endDate, productName, threshold, userId } = props;

  // // Get the current date
  // const currentDate = new Date();

  // // Define the stop date
  // const stopDate = new Date('2023-10-01');

  // // Compare the current date to the stop date
  // if (currentDate >= stopDate) {
  //   // Stop the function if the current date is on or after the stop date
  //   console.log('Aggregation stopped: Reached the stop date.');
  //   return;
  // }

  const pipeline1 = [
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
        site: { $nin: ["OBUNNA", "YENEGWE"] },
      },
    },
    { $unwind: "$products" },
    { $match: { "products.name": productName } },
    {
      $lookup: {
        from: "customers",
        localField: "customer",
        foreignField: "_id",
        as: "customerData",
      },
    },
    { $unwind: "$customerData" },
    {
      $group: {
        _id: {
          customerId: "$customerData._id",
          customerName: "$customerData.name",
          site: "$site",
          startDate: startDate,
          endDate: endDate,
        },
        totalQty: { $sum: "$products.qty" },
        totalSalesSum: {
          $sum: { $multiply: ["$products.qty", "$products.price"] },
        },
        updatedBy: { $first: userId },
        productName: { $first: "$products.name" },

        startDate: { $first: "$_id.startDate" },
        endDate: { $first: "$_id.endDate" },
      },
    },
    {
      $group: {
        _id: {
          customerId: "$_id.customerId",
          customerName: "$_id.customerName",
          startDate: "$_id.startDate",
          endDate: "$_id.endDate",
        },
        sites: {
          $addToSet: {
            site: "$_id.site",
            qty: "$totalQty",
          },
        },
        totalQty: { $sum: "$totalQty" },
        totalSalesSum: { $sum: "$totalSalesSum" },
        updatedBy: { $first: "$updatedBy" },
        productName: { $first: "$productName" },
      },
    },
    {
      $addFields: {
        specialSalesSum: {
          $cond: [{ $gte: ["$totalQty", threshold] }, "$totalSalesSum", 0],
        },
      },
    },
    {
      $addFields: {
        firstSite: { $arrayElemAt: ["$sites", 0] },
      },
    },
    {
      $sort: { "firstSite.site": 1, totalQty: -1 },
    },
    {
      $project: {
        firstSite: 0,
      },
    },
    {
      $project: {
        _id: 0,
        startDate: "$_id.startDate",
        endDate: "$_id.endDate",
        customerId: "$_id.customerId",
        customerName: "$_id.customerName",
        sites: 1,
        totalQty: 1,
        totalSalesSum: 1,
        specialSalesSum: 1,
        productName: { $literal: productName },
      },
    },
    { $match: { specialSalesSum: { $ne: 0 } } },
  ];

  const result = await FidoOrder.aggregate(pipeline1);

  const pipeline2 = [
    {
      $merge: {
        into: "CashBackCustomer",
        on: ["startDate", "endDate", "customerId", "productName"],
        whenMatched: "merge",
        whenNotMatched: "insert",
      },
    },
  ];

  await FidoOrder.aggregate([...pipeline1, ...pipeline2]);
  return result;
};
