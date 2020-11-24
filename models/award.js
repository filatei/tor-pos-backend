const mongoose = require("mongoose");
uniqueValidator = require("mongoose-unique-validator");

const awardSchema = mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // name: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Customer",
    //   required: true,
    // },
    name: { type: String },
    year: { type: Date },
    qty: { type: Number },
    location: { type: String },
    description: { type: String },
    rank: { type: Number },
    category: { type: String },
    prize: { type: String },
    remarks: { type: String },
    image: { type: String },
  },
  {
    timestamps: true,
    strict: true,
  }
);
awardSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Award", awardSchema);
