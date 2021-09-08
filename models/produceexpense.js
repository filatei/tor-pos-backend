const mongoose = require("mongoose");
uniqueValidator = require("mongoose-unique-validator");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const produceexpenseSchema = mongoose.Schema(
  {
    products: [
      {
        name: { type: String },
        description: { type: String },
        category: { type: String },
        qty: { type: Number },
        unit: { type: String },
        price: { type: Number },
        amount: { type: Number },
      },
    ],
    notes: [
      {
        text: { type: String },
        author: { type: String },
        date: { type: Date },
        image: { type: String },
      },
    ],
    log: [{}],
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Producecontact" },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updater: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    site: { type: String },
    deliveryStatus: {
      type: String,
      enum: ["DELIVERED", "NOT DELIVERED"],
    },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "VALIDATED",
        "REVIEWED",
        "OPEN",
        "APPROVED",
        "PART-PAY",
        "PAID",
        "DECLINED",
      ],
    },
    approvalComment: { type: String },
    category: { type: String },
    produceexpenseAccount: { type: String },

    payment: {},
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
    date: { type: Date },
    type: { type: String },
    txn_amount: { type: Number },
    balance: { type: Number, default: 0 },
    remarks: { type: String },
  },
  {
    timestamps: true,
    strict: true,
  }
);

produceexpenseSchema.plugin(AutoIncrement, { inc_field: "produceexpense_id" });

produceexpenseSchema.index({ "$**": "text" });

const rc = mongoose.model("Produceexpense", produceexpenseSchema);
rc.createIndexes();

produceexpenseSchema.set("autoIndex", process.env.Node_Env != "production");
produceexpenseSchema.plugin(uniqueValidator);

module.exports = rc;
