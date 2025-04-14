const mongoose = require("mongoose");
const uniqueValidator = require('mongoose-unique-validator');
const AutoIncrement = require("mongoose-sequence")(mongoose);

const fidoorderSchema = mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    response_frontend: {},
    response_backend: {},
    contactPhone: { type: String },
    contactEmail: { type: String },
    pay_type: { type: String },
    transfer_from_bank: { type: String },
    transfer_from_account_name: { type: String },
    transfer_from_date: { type: Date },
    txn_amount: { type: Number },
    paidAmount: { type: Number },
    balance: { type: Number },
    name_teller: { type: String },
    userName: { type: String },
    orderType: { type: String, enum:['INCENTIVE', 'NORMAL']},
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
    status: { type: String, enum: ["NOT PAID", "PAID", "LOADED", "COMPLETED", "DELIVERED", "CANCELLED", "AWAITING_PAYMENT"] },
    
    delivery: [
      {
        status: { type: String, enum: ["DRAFT", "LOADED", "SEEN-OUT"] },
        qty: { type: Number },
        actorId: {
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

    notes: [
      {
        text: { type: String },
        author: { type: String },
        date: { type: Date },
        image: { type: String },
      },
    ],
    log: [{}],
    comments: { type: String },
    image: { type: String },
    products: [{name: { type: String }, qty: { type: Number }, price: { type: Number }, amount: { type: Number }, }],
    totalAmount: { type: Number },
    site: { type: String },
    paymentMethod: { type: String },
    image: { type: String },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updater: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updaters: [
      {
        name: { type: String },
        date: { type: String },
      },
    ],
    platform_data: {},

    clientTime: { type: Date },
  },

  {
    timestamps: true,
  }
);


fidoorderSchema.plugin(AutoIncrement, { inc_field: "fidoOrderId" });

const rc = mongoose.model("FidoOrder", fidoorderSchema);
rc.createIndexes();

fidoorderSchema.plugin(uniqueValidator);

module.exports = rc;
