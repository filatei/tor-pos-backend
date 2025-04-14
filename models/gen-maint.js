const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const genmaintSchema = mongoose.Schema(
  {
    gen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gen",
      required: true,
    },
    date: {type: Date},
    fuelfilters: {type: Boolean},
    oilfilters: {type: Boolean},
    radiator: {type: Boolean},
    oil: {type: Boolean},
    rings: {type: Boolean},
    crankShaft: {type: Boolean},
    metals: {type: Boolean},
    turboCharger: {type: Boolean},
    pistons: {type: Boolean},
    fuelPump: {type: Boolean},
    maintenance_hour: {type: Number},
    remarks: {type: String},
    author: { type: String },
    image: { type: String }
  },
  {
    timestamps: true,
    autoindex: true,
  }
);

const rc = mongoose.model("Genmaint", genmaintSchema);

module.exports = rc;
