const mongoose = require("mongoose");

const ToramaPaySchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
   
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      
    },

    cart: [],
    totalAmount: { type: Number, required: true },
    amountPaid: { type: Number },
    paymentDate: { type: Date },

    status: { type: String, enum: ["PAID", "UNPAID", "CANCELLED"], default: "UNPAID" },

    imageText: { type: String },
    site: { type: String },
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

module.exports = mongoose.model("ToramaPay", ToramaPaySchema, 'ToramaPay');
