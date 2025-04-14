const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const photoSchema = mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updater: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    filePath: { type: String, trim: true },
    tags: [{ text: { type: String, trim: true } }],

    timeStamp: { type: Date },
  },
  {
    timestamps: true,
  }
);

photoSchema.plugin(AutoIncrement, { inc_field: "photo_id" });

photoSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Photo", photoSchema);
