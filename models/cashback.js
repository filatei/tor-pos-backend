const mongoose = require("mongoose");
// const Schema = mongoose.Schema;

const CashBackSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    productName: { type: String, required: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    attachId: { type: mongoose.Schema.Types.ObjectId, ref: "CashBackAttach" },

    site: { type: String, required: true },
    totalQty: { type: Number, required: true },
    totalSalesSum: { type: Number, required: true },
    specialSalesSum: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    status: { type: String, enum: ["PAID", "UNPAID"], default: "UNPAID" },

    imageText: { type: String },
    paymentProofImage: { type: String }, // Assuming this will be an URL to the image
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
); // This enables automatic timestamp generation

CashBackSchema.index({
  customerId: "text",
  site: "text",
  startDate: "text",
  endDate: "text",
  productName: "text",
});

module.exports = mongoose.model("CashBack", CashBackSchema);
