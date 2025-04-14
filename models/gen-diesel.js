const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const gendieselSchema = mongoose.Schema(
  {
    gen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gen",
      required: true,
    },
    date: {type: Date},
    diesel_litres: {type: Number},
    diesel_hours: {type: Number},
    remarks: { type: String },
    author: { type: String },
    image: { type: String },
  },
  {
    timestamps: true,
    autoindex: true,
  }
);


const rc = mongoose.model("Gendiesel", gendieselSchema);

module.exports = rc;
