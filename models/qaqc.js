const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const qaqcSchema = mongoose.Schema(
  {
    reportDate: { type: Date },
    location: { type: String },
    report: [
      {
        name: { type: String },
        result: { type: String },
        refRange: { type: String },
        remarks: { type: String },
      },
    ],

    category: { type: String },
    comments: { type: String },
    remarks: { type: String },
    observation: { type: String },
    refRange: { type: String },
    observationScale: { type: Number },
    refRangeScale: { type: Number },
    expert: { type: String },
    image: { type: String },
    status: { type: String },
    alarm: { type: Boolean },
    images: [String],
    notes: [
      {
        text: { type: String },
        author: { type: String },
        date: { type: Date },
        image: { type: String },
      },
    ],
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updater: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    autoindex: true,
  }
);

qaqcSchema.plugin(AutoIncrement, { inc_field: "qaqc_id" });

qaqcSchema.index({
  location: "text",
  reportDate: "text",
  category: "text",
});

const rc = mongoose.model("Qaqc", qaqcSchema);
rc.createIndexes();

qaqcSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Qaqc", qaqcSchema);
