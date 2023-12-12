const Message = require('../Modals/Message')
const { verifyToken } = require('./verifyToken')

const router = require('express').Router()

// get msg

router.post('/msg', async (req, res) => {
  try {
    const { from, to, message, files } = req.body
    const newMessage = await Message.create({
      message: message,
      sender: from,
      chatUsers: [from, to],
      files: files
    })
    res.status(200).json(newMessage)
  } catch (error) {
    return res.status(500).json('Internal server error')

  }
})

// get msg
router.get('/:userId1/:userId2', verifyToken, async (req, res) => {
  try {
    const { userId1, userId2 } = req.params
    const messages = await Message.find({ chatUsers: { $all: [userId1, userId2] } }).sort({ updatedAt: 1 })
    const allMessage = messages.map(msg => {
      return {
        sender: msg.sender,
        mySelf: msg.sender.toString() === userId1,
        message: msg.message,
        files: msg.files
      }
    })
    return res.status(200).json(allMessage)
  } catch (error) {
    return res.status(500).json('Internal server error')
  }
})

module.exports = router
