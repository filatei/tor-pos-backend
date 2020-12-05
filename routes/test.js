db.recuploads.aggregate([
  {
    $group: {
      _id: { $month: { $toDate: "$createdAt" } },
      totals: { $sum: { $unwind: "$products.qty" } },
    },
  },
  { $sort: { _id: 1 } },
]);

// group by product total sales in DB
db.recuploads.aggregate(
  [
    { $unwind: "$products" },
    { $unwind: "$products.name" },
    { $unwind: "$products.qty" },
    { $unwind: "$products.price" },

    {
      $group: {
        _id: { $month: { $toDate: "$createdAt" } },

        totalSalesAmount: {
          $sum: {
            $multiply: [
              { $toInt: "$products.price" },
              { $toInt: "$products.qty" },
            ],
          },
        },
        totalQty: { $sum: "$products.qty" },
      },
    },
    { $limit: 5 },
  ],
  {
    allowDiskUse: true,
  }
);

// top 5 customers by sales amount overall
db.recuploads.aggregate(
  [
    { $unwind: "$products" },
    { $unwind: "$products.name" },
    { $unwind: "$products.qty" },
    { $unwind: "$products.price" },
    {
      $lookup: {
        from: "customers",
        localField: "customer",
        foreignField: "_id",
        as: "customer",
      },
    },

    {
      $group: {
        _id: { customer: "$customer.name" },

        totalSalesAmount: {
          $sum: {
            $multiply: [
              { $toInt: "$products.price" },
              { $toInt: "$products.qty" },
            ],
          },
        },
        totalQty: { $sum: "$products.qty" },
      },
    },

    { $sort: { totalSalesAmount: -1 } },
    { $limit: 5 },
  ],
  {
    allowDiskUse: true,
  }
);

// top 5 for month of year
db.recuploads.aggregate(
  [
    { $unwind: "$products" },
    { $unwind: "$products.name" },
    { $unwind: "$products.qty" },
    { $unwind: "$products.price" },
    {
      $lookup: {
        from: "customers",
        localField: "customer",
        foreignField: "_id",
        as: "customer",
      },
    },

    {
      $group: {
        _id: {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
          customer: "$customer.name",
        },

        totalSalesAmount: {
          $sum: {
            $multiply: [
              { $toInt: "$products.price" },
              { $toInt: "$products.qty" },
            ],
          },
        },
        totalQty: { $sum: "$products.qty" },
      },
    },

    { $sort: { "_id.year": 1, "_id.month": -1, totalSalesAmount: -1 } },
    { $limit: 5 },
  ],
  {
    allowDiskUse: true,
  }
);

products = [
  "19L Dispenser",
  "Fido Pure Water",
  "50Cl Crate",
  "60Cl Crate",
  "75Cl Crate",
];

// top 10 for month of year where terminal_location is Kpansia and product 'Fido Pure Water'
db.recuploads.aggregate(
  [
    { $unwind: "$products" },
    { $unwind: "$products.name" },
    { $unwind: "$products.qty" },
    { $unwind: "$products.price" },
    {
      $lookup: {
        from: "customers",
        localField: "customer",
        foreignField: "_id",
        as: "customer",
      },
    },

    {
      $group: {
        _id: {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
          customer: "$customer.name",
          site: "$terminal_location",
          products: "$products.name",
        },

        totalSalesAmount: {
          $sum: {
            $multiply: [
              { $toInt: "$products.price" },
              { $toInt: "$products.qty" },
            ],
          },
        },
        totalQty: { $sum: "$products.qty" },
      },
    },
    {
      $match: {
        $and: [
          {
            // "_id.site": "KPANSIA",
            "_id.products": "Fido Pure Water",
          },
        ],
      },
    },

    { $sort: { "_id.year": 1, "_id.month": -1, totalSalesAmount: -1 } },
    { $limit: 10 },
  ],
  {
    allowDiskUse: true,
  }
);

// total sales and total qty group by site and product
db.recuploads.aggregate(
  [
    { $unwind: "$products" },
    { $unwind: "$products.name" },
    { $unwind: "$products.qty" },
    { $unwind: "$products.price" },
    {
      $lookup: {
        from: "customers",
        localField: "customer",
        foreignField: "_id",
        as: "customer",
      },
    },

    {
      $group: {
        _id: {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
          customer: "$customer.name",
          site: "$terminal_location",
          products: "$products.name",
        },

        totalSalesAmount: {
          $sum: {
            $multiply: [
              { $toInt: "$products.price" },
              { $toInt: "$products.qty" },
            ],
          },
        },
        totalQty: { $sum: "$products.qty" },
      },
    },
    {
      $match: {
        $and: [
          {
            // "_id.site": "KPANSIA",
            "_id.month": 11,
            "_id.products": "Fido Pure Water",
          },
        ],
      },
    },

    { $sort: { "_id.year": 1, "_id.month": -1, totalQty: -1 } },
    { $limit: 20 },
  ],
  {
    allowDiskUse: true,
  }
);
