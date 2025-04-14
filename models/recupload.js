const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const recuploadSchema = mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    driver: {},
    pay_type: { type: String },
    transfer_from_bank: { type: String },
    transfer_from_account_name: { type: String },

    name_teller: { type: String },
    txn_amount: { type: Number, required: true },
    amt_teller: { type: Number },
    date_teller: { type: Date },

    log_code: { type: String },
    acquirer: { type: String },
    stan: { type: String },
    rrn: { type: String },
    trans_id: { type: String },
    tx_ref: { type: String },
    status: { type: String },
    bank: { type: String },
    card_number: { type: String },
    action_taken: { type: String },
    trans_date: { type: Date },
    reply_date: { type: Date },
    received_date: { type: Date },
    receipt_id: { type: String },
    auth_id: { type: String },
    expiry_date: { type: Date },
    company: { type: String },
    remarks: { type: String },
    card_bank: { type: String },
    terminal_id: { type: String },
    term_id: { type: mongoose.Schema.Types.ObjectId, ref: "Terminal" },

    terminal_location: { type: String },
    comments: { type: String },
    image: { type: String },
    products: [
      {
        name: { type: String },
        qty: { type: Number },
        price: { type: Number },
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

recuploadSchema.plugin(AutoIncrement, { inc_field: "rec_id" });

recuploadSchema.index({
  stan: "text",
  rrn: "text",
  auth_id: "text",
  receipt_id: "text",
  terminal_location: "text",
  acquirer: "text",
  card_number: "text",
  action_taken: "text",
  trans_date: "text",
  company: "text",
});

const rc = mongoose.model("Recupload", recuploadSchema);
// rc.createIndexes();

// recuploadSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Recupload", recuploadSchema);
