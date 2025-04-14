const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const gennotesSchema = mongoose.Schema(
  {
    gen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gen",
      required: true,
    },
    text: {type: String},
    date: {type: Date},
    author: { type: String },
    image: {type: String}

  },
  {
    timestamps: true,
    autoindex: true,
  }
);

const rc = mongoose.model("Gennotes", gennotesSchema);

module.exports = rc;
