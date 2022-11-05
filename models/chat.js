const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const chatSchema = mongoose.Schema(
  {
    creatorHash: {  type: String, required: true}, //concat creator,receiver
    receiverHash: {  type: String, required: true}, // concat receiver, creator
    msg: { type: String },
    timeStamp: { type: Date, required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    readers: [{
      id:  {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    }],
    deletedByUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    file: { type: String },
    files: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

chatSchema.plugin(AutoIncrement, { inc_field: "chat_id" });
chatSchema.set("autoIndex", process.env.Node_Env != "production");

module.exports = mongoose.model("Chat", chatSchema);
