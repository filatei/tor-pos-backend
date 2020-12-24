const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const cashdepositSchema = mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updater: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    image: { type: String },
    payeeAcct: { type: String },
    depositor: { type: String, trim: true },
    status: { type: String },
    site: { type: String },
    amount: { type: Number },
  },
  {
    timestamps: true,
    strict: true,
  }
);

cashdepositSchema.plugin(AutoIncrement, { inc_field: "cashDeposit_id" });

module.exports = mongoose.model("Cashdeposit", cashdepositSchema);
