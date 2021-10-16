const mongoose = require("mongoose");
uniqueValidator = require("mongoose-unique-validator");

const producecustomerSchema = mongoose.Schema(
  {
    name: { type: String, lowercase: false, trim: true, required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
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
    // createdAt: {type: Date, Default: Date.now},
    // updatedAt: {type: Date, Default: Date.now},
  },
  {
    timestamps: true,
    strict: true,
  }
);

producecustomerSchema.set("autoIndex", process.env.Node_Env != "production");
producecustomerSchema.plugin(uniqueValidator);

module.exports = mongoose.model("ProduceCustomer", producecustomerSchema);
