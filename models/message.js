const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const messageSchema = mongoose.Schema(
  {
    subject: { type: String },
    body: { type: String },
    sender: { type: String },
    to: { type: String },
    cc: { type: String },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    readers: [{
      id:  {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    }],
    receivers: [{
      id:  {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    }],
   
    images: [],
    image: { type: String },
    notes: [],
    link: { type: String },
  },
  {
    timestamps: true,
  }
);

messageSchema.plugin(AutoIncrement, { inc_field: "message_id" });
messageSchema.set("autoIndex", process.env.Node_Env != "production");

module.exports = mongoose.model("Message", messageSchema);
