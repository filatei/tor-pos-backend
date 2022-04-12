const mongoose = require("mongoose");
uniqueValidator = require("mongoose-unique-validator");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const callManagerSchema = mongoose.Schema(
  {
   
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
    name: { type: String },
    site: { type: String },
    phone: { type: String },
    calledPhone: { type: String },
    message: { type: String },
    response: { type: String },
    responder: { type: String },

   
    status: {
      type: String,
      enum: [
        "DRAFT",
        "VALIDATED",
        "REVIEWED",
        "APPROVED",
        "CLOSED",
      ],
    },
    statusHistory: [
      {
        oldStatus: { type: String },
        newStatus: { type: String },
        updater: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],
    remarks: { type: String },
  },
  {
    timestamps: true,
    strict: true,
  }
);

callManagerSchema.plugin(AutoIncrement, { inc_field: "callManager_id" });

callManagerSchema.index({ "$**": "text" });

const rc = mongoose.model("CallManager", callManagerSchema);
rc.createIndexes();

callManagerSchema.set("autoIndex", process.env.Node_Env != "production");
callManagerSchema.plugin(uniqueValidator);

module.exports = rc;
