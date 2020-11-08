const mongoose = require("mongoose");
uniqueValidator = require("mongoose-unique-validator");

const awardSchema = mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    year: { type: Number },
    location: { type: String },
    position: { type: String },
    category: { type: String },
    prize: { type: String },
  },
  {
    timestamps: true,
    strict: true,
  }
);
awardSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Award", awardSchema);
