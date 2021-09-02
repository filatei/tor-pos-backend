const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const produceitemSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: false,
      trim: true,
      collation: { locale: "en", strength: 3 },
    },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updater: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    description: { type: String },
    unit: { type: String },
    category: { type: String },
    barcode: { type: String },
    icon: { type: String },
  },
  {
    timestamps: true,
  }
);

produceitemSchema.plugin(AutoIncrement, { inc_field: "produceitem_id" });

produceitemSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Produceitem", produceitemSchema);
