const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  chatUsers: {
    type: Array,
    required: true
  },
  message: {
    type: String,
    // required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  }
  ,
  files: [
    {
      link: {
        type: String
      },
      name: {
        type: String
      },
      type: {
        type: String
      }
    }
  ]
}, { timestamps: true })

module.exports = mongoose.model("Message", MessageSchema)
