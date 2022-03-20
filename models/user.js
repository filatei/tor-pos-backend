const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const userSchema = mongoose.Schema(
  {
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
    otp: { type: String },
    phone: { type: String },
    roles: [],
    role: { type: String, enum:["ADMIN", "MANAGER","GENERAL MANAGER","HR","SNR ACCOUNTANT",
      "ACCOUNTANT","SUPERVISOR","QAQC","SNR SECRETARY","SECRETARY","STOREKEEPER",
      "BAGGER", "SECURITY", "LOADER", "OFFICEKEEPER", "POLICE", "CONSULTANT",
      "OFFICER", "BUYER", "OTHER",
    ]},
    nin: { type: String, maxLength: 11, minLength: 11, trim: true },
    verify: { type: String },
    isVerified: { type: Boolean },
    resetLink: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User", userSchema);
