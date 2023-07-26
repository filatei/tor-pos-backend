const mongoose = require("mongoose");

const CashBackCustomerSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    productName: { type: String, required: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    sites: [],
    totalQty: { type: Number, required: true },
    totalSalesSum: { type: Number, required: true },
    specialSalesSum: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    paymentDate: { type: Date },

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

module.exports = mongoose.model("CashBackCustomer", CashBackCustomerSchema, 'CashBackCustomer');
