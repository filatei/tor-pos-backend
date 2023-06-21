const mongoose = require("mongoose");
uniqueValidator = require("mongoose-unique-validator");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const expenseSchema = mongoose.Schema(
  {
    products: [
      {
        name: { type: String, required: true },
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
    company: { type: String },
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
    title: { type: String },
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

expenseSchema.plugin(AutoIncrement, { inc_field: "expense_id" });

expenseSchema.index({ "$**": "text" });

const rc = mongoose.model("Expense", expenseSchema);
rc.createIndexes();

expenseSchema.set("autoIndex", process.env.Node_Env != "production");
expenseSchema.plugin(uniqueValidator);

module.exports = rc;

// const mongoose = require("mongoose");
// const uniqueValidator = require("mongoose-unique-validator");
// const AutoIncrement = require("mongoose-sequence")(mongoose);

// const productSchema = new mongoose.Schema({
//   name: { type: String },
//   description: { type: String },
//   category: { type: String },
//   qty: { type: Number },
//   unit: { type: String },
//   price: { type: Number },
//   amount: { type: Number },
// });

// const noteSchema = new mongoose.Schema({
//   text: { type: String },
//   author: { type: String },
//   date: { type: Date },
//   image: { type: String },
// });

// const payHistorySchema = new mongoose.Schema({
//   bankAcct: { type: String },
//   paymentDate: { type: Date },
//   memo: { type: String },
//   paidAmount: { type: Number },
//   date: { type: Date, default: Date.now },
//   payer: { type: String },
// });

// const statusHistorySchema = new mongoose.Schema({
//   oldStatus: { type: String },
//   newStatus: { type: String },
//   updater: { type: String },
//   date: { type: Date, default: Date.now },
// });

// const expenseSchema = new mongoose.Schema(
//   {
//     products: [productSchema],
//     notes: [noteSchema],
//     log: [{}], // Define this more specifically if you can
//     vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
//     creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//     updater: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//     // Other fields ...
//     approvalComment: { type: String },
//     title: { type: String },
//     category: { type: String },
//     expenseAccount: { type: String },
//     site: { type: String },
//     company: { type: String },
//     type: { type: String },
//     txn_amount: { type: Number },
//     balance: { type: Number, default: 0 },
//     remarks: { type: String },
//     payHistory: [payHistorySchema],
//     statusHistory: [statusHistorySchema],
//   },
//   {
//     timestamps: true,
//     strict: true,
//   }
// );

// // Remove this if not necessary, or change to specific fields
// // expenseSchema.index({ "$**": "text" });
// expenseSchema.plugin(AutoIncrement, { inc_field: "expense_id" });

// const Expense = mongoose.model("Expense", expenseSchema);

// module.exports = Expense;
