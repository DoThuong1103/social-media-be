const mongoose = require('mongoose')

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  userPost: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    // required: true
  },
  content: {
    type: String,
  },
  active: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model('Notification', NotificationSchema)
