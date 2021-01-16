const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const shoporderSchema = mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    contactPhone: { type: String },
    contactEmail: { type: String },
    pay_type: { type: String },
    transfer_from_bank: { type: String },
    transfer_from_account_name: { type: String },
    transfer_from_date: { type: Date },
    txn_amount: { type: Number, required: true },
    paidAmount: { type: Number, required: true },
    name_teller: { type: String },
    teller_id: {
      type: String,
      lowercase: true,
      trim: true,
    },
    amt_teller: { type: Number },
    date_teller: { type: Date },
    log_code: { type: String },
    acquirer: { type: String },
    stan: { type: String },
    rrn: { type: String },
    trans_id: { type: String },
    tx_ref: { type: String },
    status: { type: String, enum: ["PAID", "LOADED", "COMPLETED"] },
    delivery: [
      {
        status: { type: String, enum: ["DRAFT", "LOADED", "SEEN-OUT"] },
        qty: { type: Number },
        actorId: {
          // supervisor or security person at final gate
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        date: { type: Date, default: Date.now },
        geoLocation: {
          latitude: { type: Number },
          longitude: { type: Number },
          timestamp: { type: Number },
        },
        site: { type: String },
        photo: { type: String },
      },
    ],
    bank: { type: String },
    card_id: { type: mongoose.Schema.Types.ObjectId, ref: "Card" },
    card_number: { type: String },
    card_bank: { type: String },
    action_taken: { type: String },
    trans_date: { type: Date },
    reply_date: { type: Date },
    received_date: { type: Date },
    receipt_id: { type: String },
    auth_id: { type: String },
    expiry_date: { type: Date },
    company: { type: String },
    remarks: { type: String },
    terminal_id: { type: mongoose.Schema.Types.ObjectId, ref: "Terminal" },
    terminal_location: { type: String },
    geoLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    comments: { type: String },
    image: { type: String },
    products: [],
    receipt: {},
    totalAmount: { type: Number },
    site: { type: String },
    paymentMethod: { type: String },
    image: { type: String },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updater: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    autoindex: true,
  }
);

// shoporderSchema.plugin(AutoIncrement, { inc_field: "id" });

shoporderSchema.index({
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

shoporderSchema.plugin(AutoIncrement, { inc_field: "orderId" });

const rc = mongoose.model("Shoporder", shoporderSchema);
rc.createIndexes();

shoporderSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Shoporder", shoporderSchema);
