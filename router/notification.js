const router = require('express').Router();
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



router.get("/notification", verifyToken, async (req, res) => {
  // try {
  // const notification = await Notification.find({ user: req.user.id })
  //   .populate({
  //     path: 'user',
  //     model: "User",
  //     select: "avatar "
  //   })
  //   .populate({
  //     path: 'userPost',
  //     model: 'User',
  //     select: "avatar "
  //   })
  //   .exec()
  // res.status(200).json(notification)
  // } catch (error) {
  //   return res.status(500).json("Internal error occured")
  // }
})

module.exports = router
