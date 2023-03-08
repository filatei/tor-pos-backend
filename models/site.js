const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const siteSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      collation: { locale: "en", strength: 3 },
    },
    buildDate: { type: Date },
    address:  String,
    phone: String,
    email: String,
    icon: String,
    image: String,
    taxRate: { type: Number, default: 0 },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updater: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamp: true,
  }
);

siteSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Site", siteSchema);
