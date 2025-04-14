const mongoose = require("mongoose");

const filemanagerSchema = mongoose.Schema(
  {
    name: { type: String },
    location: { type: String },

    remarks: { type: String },
  },
  {
    timestamps: true,
    strict: true,
  }
);

const rc = mongoose.model("Filemanager", filemanagerSchema);

module.exports = rc;
