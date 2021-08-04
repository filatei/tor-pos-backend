const mongoose = require("mongoose");
// const uniqueValidator = require('mongoose-unique-validator');
const AutoIncrement = require("mongoose-sequence")(mongoose);

const liabilitySchema = mongoose.Schema(
  {
    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site" },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updater: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    liabType: { type: String },
    amount: { type: Number },
    balance: { type: Number },
    remarks: { type: String },
    company: { type: String },
    bank: { type: String },
    remarks: { type: String },
    image: { type: String },

    barcode: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    status: { type: String, enum: ["OPEN", "PAID"] },
    notes: [
      {
        text: { type: String },
        author: { type: String },
        date: { type: Date },
        image: { type: String },
      },
    ],
    log: [{}],
    payment: {
      bankAcct: { type: String },
      paymentDate: { type: Date },
      memo: { type: String },
      paidAmount: { type: Number },
      date: { type: Date, default: Date.now },
      payer: { type: String },
    },
    payHistory: [
      {
        bankAcct: { type: String },
        paymentDate: { type: Date },
        memo: { type: String },
        paidAmount: { type: Number },
        date: { type: Date, default: Date.now },
        payer: { type: String },
      },
    ],
    statusHistory: [
      {
        oldStatus: { type: String },
        newStatus: { type: String },
        updater: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

liabilitySchema.plugin(AutoIncrement, { inc_field: "liability_id" });
// liabilitySchema.plugin( uniqueValidator );

module.exports = mongoose.model("Liability", liabilitySchema);
