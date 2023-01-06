const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const userSchema = mongoose.Schema(
  {
    userId: {type: String},
    family_name: {type: String},
    given_name: {type: String},
    domain: {type: String},
    name: { type: String, trim: true, index: true },
    email: {
      type: String,
      match: /^\S+@\S+\.\S+$/,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    image: { type: String },
    site: { type: String },
    phone: { type: String },
    lastSeen: { type: Date },
    roles: [],
    role: { type: String, enum:["ADMIN", "MANAGER","GENERAL MANAGER","HR","SNR ACCOUNTANT",
      "ACCOUNTANT","SUPERVISOR","QAQC","SNR SECRETARY","SECRETARY","STOREKEEPER",
      "BAGGER", "SECURITY", "LOADER", "OFFICEKEEPER", "POS OFFICER", "POLICE", "CONSULTANT",
      "OFFICER", "BUYER", "OTHER",
    ]},
    nin: { type: String, maxLength: 11, minLength: 11, trim: true },
  },
  {
    timestamps: true,
  }
);

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("FiaUser", userSchema);
