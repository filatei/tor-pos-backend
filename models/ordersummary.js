const mongoose = require("mongoose");

const orderSummarySchema = mongoose.Schema(
  {
    date: { type: Date, required: true },
    totalSalesForTheDay: { type: Number },
    products: [
      {
        name: { type: String},
        totalQty: { type: Number },
        totalSalesAmount: { type: Number },
        sites: [
          {
            site: { type: String },
            totalQty: { type: Number },
            totalSalesAmount: { type: Number },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("OrderSummaries", orderSummarySchema);
