const mongoose = require("mongoose");
uniqueValidator = require("mongoose-unique-validator");

const terminalSchema = mongoose.Schema(
  {
    terminal_id: { type: String, required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    bank: { type: String, trim: true, uppercase: true },
    terminal_location: { type: String, uppercase: true, trim: true },
    company: { type: String, uppercase: true, trim: true },
    sn: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
    strict: true,
  }
);

terminalSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Terminal", terminalSchema);
