const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const fiaOrderSchema = mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FiaCustomer",
    },
    name: { type: String },
    contactPhone: { type: String },
    contactEmail: { type: String },
    pay_type: { type: String },
    transfer_from_bank: { type: String },
    transfer_from_account_name: { type: String },
    transfer_from_date: { type: Date },
    txn_amount: { type: Number, required: true },
    paidAmount: { type: Number, required: true },
    amount_settled: { type: Number },
    charged_amount: { type: Number},
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
    response_frontend: {},
    response_backend: {},
    stan: { type: String },
    rrn: { type: String },
    trans_id: { type: String },
    tx_ref: { type: String },
    status: { type: String, enum: ["NOT PAID", "PAID", "LOADED", "COMPLETED"] },
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
    products: [],
    receipt: {},
    totalAmount: { type: Number },
    site: { type: String },
    paymentMethod: { type: String },
    image: { type: String },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "FiaUser" },
    updater: { type: mongoose.Schema.Types.ObjectId, ref: "FiaUser" },
    updaters: [{
        updaterId: { type: String },
        time: { type: Date },
    }],

    clientTime: { type: Date },
  },

  {
    timestamps: true,
    autoindex: true,
  }
);


fiaOrderSchema.index({
  receipt_id: "text",
  site: "text",
  acquirer: "text",
  card_number: "text",
  action_taken: "text",
  trans_date: "text",
  company: "text",
  status: "text",
});

fiaOrderSchema.plugin(AutoIncrement, { inc_field: "fiaOrderId" });

const rc = mongoose.model("FiaOrder", fiaOrderSchema);
rc.createIndexes();

fiaOrderSchema.plugin(uniqueValidator);

module.exports = rc;
