const mongoose = require('mongoose')

const PostSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  images: {
    type: Array,
  },
  video: {
    type: String,
  },
  like: {
    type: Array,
  },
  dislike: {
    type: Array,
  },
  comments: [
    {
      user: {
        type: mongoose.Schema.ObjectId,
        require: true
      },
      comment: {
        type: String,
        require: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      cmtMain: {
        type: mongoose.Schema.ObjectId,
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
})


module.exports = mongoose.model('Post', PostSchema)
