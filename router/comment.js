const router = require("express").Router();
const User = require('../Modals/User');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { verifyToken } = require("./verifyToken");
const nodemailer = require("nodemailer");
const jwt = require('jsonwebtoken');
const Post = require('../Modals/Post');
const { generateOTP } = require('./Extra/mail');
const VerificationToken = require('../Modals/VerificationToken');
const ResetToken = require('../Modals/ResetToken');
const JWTKEY = 'bdssuifhs224!41n2k5#'
const crypto = require("crypto");
const Notification = require('../Modals/Notification');

// Create comment
router.post("/createComment", verifyToken, async (req, res) => {
  // try {
  let { postId, user, userMain, comment } = req.body
  let newComment = new Comment({
    postId,
    user,
    userMain,
    comment
  })
  await newComment.save()
  res.status(200).json("Comment has been posted!")
  // } catch (error) {
  //   return res.status(500).json(error)
  // }
})

router.get("/:id", async (req, res) => {
  try {
    const comments = await Comment.findById(req.params.id)
    res.status(200).json(comments)
  } catch (error) {
    return res.status(500).json(error)
  }
})

module.exports = router
