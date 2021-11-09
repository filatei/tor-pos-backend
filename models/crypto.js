const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const cryptoSchema = mongoose.Schema(
  {
    name: { type: String, trim: true },
    id: { type: String, required: true },
    rank: { type: String, required: true },
    priceUsd: { type: Number },
    symbol: { type: String },

    circulating_supply: { type: Number },
    cmc_rank: { type: Number },
    date_added: { type: Date },
    last_updated: { type: Date },
    max_supply: { type: Number },
    num_market_pairs: { type: Number },
    platform: { type: String },
    quote: { },
    quote: { 
      name: {type: String },
       price: {type: String }, 
       volume_24h: {type: Number }, 
       volume_change_24h: {type: Number },
        percent_change_1h: {type: Number }, 
        percent_change_24h: {type: Number }, 
        percent_change_7d: {type: Number }, 
        percent_change_30d: {type: Number }, 
        percent_change_60d: {type: Number }, 
        percent_change_90d: {type: Number }, 
        market_cap: {type: Number }, 
        market_cap_dominance: {type: Number }, 
        fully_diluted_market_cap: {type: Number }, 
        last_updated: {type: Date }
    },
    slug: {rype: String},
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updater: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

cryptoSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Crypto", cryptoSchema);
