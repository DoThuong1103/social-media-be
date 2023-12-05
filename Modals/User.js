const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  Followers: {
    type: Array,
  },
  Following: {
    type: Array,
  },
  phonenumber: {
    type: Number,
    required: true
  },
  profile: {
    type: String,
  },
  avatar: {
    type: String,
  },
  coverImage: {
    type: String,
  },
  relationship: {
    type: String,
  },
  verified: {
    type: Boolean,
    required: true,
    default: false
  },
  friends: {
    type: Array,
  },
  addFriends: {
    type: Array,
  },
  friendRequest: {
    type: Array,
  },
  birthDay: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model('User', UserSchema)
