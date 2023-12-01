const mongoose = require('mongoose')

const CommentsSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  comment: {
    type: String,
    required: true
  },
  userMain: {
    type: mongoose.Schema.Types.ObjectId,
  },
  like: {
    type: Array,
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model('Comments', CommentsSchema)
