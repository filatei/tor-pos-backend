const mongoose = require("mongoose");
uniqueValidator = require("mongoose-unique-validator");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const produceSchema = mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    notes: [
      {
        text: { type: String },
        author: { type: String },
        date: { type: Date },
        image: { type: String },
      },
    ],
    log: [{}],
    qty: { type: Number },
    machine: { type: String, trim: true },
    operator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    cementbags: { type: Number },

    sand: { type: Number },

    stonedust: { type: Number },
    measure: { type: String, trim: true },

    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site" },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updater: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deliveryStatus: {
      type: String,
      enum: ["DELIVERED", "NOT DELIVERED"],
    },

    status: {
      type: String,
      enum: ["DRAFT", "VALIDATED", "REVIEWED", "APPROVED"],
    },
    category: { type: String },
    statusHistory: [
      {
        oldStatus: { type: String },
        newStatus: { type: String },
        updater: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],
    dateProduced: { type: Date },
    remarks: { type: String },
  },
  {
    timestamps: true,
    strict: true,
  }
);

produceSchema.plugin(AutoIncrement, { inc_field: "produce_id" });

produceSchema.index({ "$**": "text" });

const rc = mongoose.model("Produce", produceSchema);
rc.createIndexes();

produceSchema.set("autoIndex", process.env.Node_Env != "production");
produceSchema.plugin(uniqueValidator);

module.exports = rc;
