const mongoose = require("mongoose");
uniqueValidator = require("mongoose-unique-validator");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const expenseSchema = mongoose.Schema(
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
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updater: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    site: { type: String },
    status: { type: String },
    approvalComment: { type: String },
    category: { type: String },
    expenseAccount: { type: String },

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

expenseSchema.plugin(AutoIncrement, { inc_field: "expense_id" });

expenseSchema.index({ "$**": "text" });

const rc = mongoose.model("Expense", expenseSchema);
rc.createIndexes();

expenseSchema.set("autoIndex", process.env.Node_Env != "production");
expenseSchema.plugin(uniqueValidator);

module.exports = rc;
