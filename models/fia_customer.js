const mongoose = require("mongoose");
uniqueValidator = require("mongoose-unique-validator");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const fiaCustomerSchema = mongoose.Schema(
  {
    name: { type: String, lowercase: false, trim: true, required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "FiaUser" },
    updater: { type: mongoose.Schema.Types.ObjectId, ref: "FiaUser" },
    phone: { type: String },
    drivers: [
      {
        name: { type: String },
        phone: { type: String },
      },
    ],

    email: { type: String },
    icon: { type: String },
    barcode: { type: String },
    biometric: { type: String },
    phones: [],
    emails: [],
    cards: [
      {
        card_name: { type: String },
        card_number: { type: String },
        card_type: { type: String },
        card_bank: { type: String },
      },
    ],
    address: {
      street: String,
      city: String,
      state: String,
      zipcode: String,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

fiaCustomerSchema.plugin(AutoIncrement, { inc_field: "fiaCustomerId" });
fiaCustomerSchema.set("autoIndex", process.env.Node_Env != "production");
fiaCustomerSchema.plugin(uniqueValidator);

module.exports = mongoose.model("FiaCustomer", fiaCustomerSchema);
