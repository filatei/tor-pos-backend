const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const photoSchema = mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updater: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    filepath: { type: string, trim: true },
    photos: [
      {
        webviewPath: { type: string, trim: true },
        userSite: { type: string, trim: true },
      },
    ],

    date: { type: Date },
  },
  {
    timestamps: true,
  }
);

photoSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Photo", photoSchema);
