const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const genSchema = mongoose.Schema(
  {
    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
   
   
    name: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, trim: true,},
    sn: { type: String, trim: true,},
    brand: { type: String, required: true, trim: true, uppercase: true },
    model: { type: String, required: true, trim: true, uppercase: true },
    kva: { type: Number, required: true, trim: true, uppercase: true },
      
    current_hour: {
      date: {type: Date},
      hour: {type: Number},
      author: { type: String },
      
    },
    hour_history: [{
      date: {type: Date},
      hour: {type: Number},
      author: { type: String },
      
    }],
    current_maintenance:{
      date: {type: Date},
      fuelfilters: {type: Boolean},
      oilfilters: {type: Boolean},
      radiator: {type: Boolean},
      oil: {type: Boolean},
      maintenance_hour: {type: Number},
      remarks: {type: String},
      author: { type: String }
     },
    maintenance_history: [
      {
      date: {type: Date},
      fuelfilters: {type: Boolean},
      oilfilters: {type: Boolean},
      radiator: {type: Boolean},
      oil: {type: Boolean},
      maintenance_hour: {type: Number},
      remarks: {type: String},
      author: { type: String }
     }],
    notes: [{
      text: {type: String},
      date: {type: Date},
      author: { type: String },
      image: {type: String}
    }],
    note: {
      text: {type: String},
      date: {type: Date},
      author: { type: String },
      image: {type: String}
    },
    purchase_date: {type: Date},
    purchase_price: {type: Number},
    purchase_hour_reading: {type: Number},
    image: {type: String},
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updater: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    autoindex: true,
  }
);

genSchema.plugin(AutoIncrement, { inc_field: "gen_id" });

const rc = mongoose.model("Gen", genSchema);

module.exports = rc;
