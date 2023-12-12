const mongoose = require('mongoose')

const GroupSchema = new mongoose.Schema({
  groupName: {
    type: String,
    required: true
  },
  coverImage: {
    type: String,
  },
  users: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      role: {
        type: String,
        default: 'user'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  privacy: {
    type: String,
  },
  description: {
    type: String,
  },
  groupRequest: {
    type: Array,
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model('Group', GroupSchema)
