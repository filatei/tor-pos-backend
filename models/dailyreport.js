const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const dailyreportSchema = mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updater: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },

    production: [
      {
        name: { type: String },
        opening: { type: Number },
        produced: { type: Number },
        sales: { type: Number },
        damaged: { type: Number },
        balance: { type: Number },
        cement: { type: Number, default: 0 },
        date: { type: Date, default: Date.now },
        remarks: { type: String },
      },
    ],
    image: { type: String },
    reportType: { type: String, enum: ["Morning", "Afternoon", "Evening"] },
    machine: { type: String, trim: true },
    date: { type: Date },
    people: { type: String, trim: true },
    quality: { type: String, trim: true },
    fuel: { type: String, trim: true },
    roreadings: [
      {
        name: { type: String },
        purewater: { type: Number },
        wastewater: { type: Number },
        date: { type: Date, default: Date.now },
        remarks: { type: String },
      },
    ],
    qualityreadings: [
      {
        name: { type: String },
        reading: { type: Number, default: 0 },
        remarks: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],
    incidents: { type: String, trim: true },
    body: { type: String, trim: true },
    financials: { type: String, trim: true },
    status: { type: String, enum: ["NOT SEEN", "SEEN"] },
    notes: [
      {
        text: { type: String },
        author: { type: String },
        date: { type: Date },
        image: { type: String },
      },
    ],
    log: [{}],
    cashathand: { type: Number },
    expenses: { type: Number },
    rollsrock: { type: Number },
    roreading: { type: Number },
    crate75clstock: { type: Number },
    crate50clstock: { type: Number },
    packbagavailstock: { type: Number },
    purewatersales: { type: Number },
    packbagopenstock: { type: Number },
    purewateropenstock: { type: Number },
    purewateravailstock: { type: Number },
  },
  {
    timestamps: true,
    strict: true,
  }
);

dailyreportSchema.plugin(AutoIncrement, { inc_field: "dailyreport_id" });

module.exports = mongoose.model("dailyreport", dailyreportSchema);
