const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const userSchema = mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    image: { type: String },
    site: { type: String },
    roles: [],
    role: { type: String },
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
