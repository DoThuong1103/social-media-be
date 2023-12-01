const router = require("express").Router();
const User = require('../Modals/User');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { verifyToken } = require("./verifyToken");
const nodemailer = require("nodemailer");
const jwt = require('jsonwebtoken');
const { generateOTP } = require('./Extra/mail');
const VerificationToken = require('../Modals/VerificationToken');
const ResetToken = require('../Modals/ResetToken');
const JWTKEY = 'bdssuifhs224!41n2k5#'
const crypto = require("crypto");
const Notification = require('../Modals/Notification');
const Message = require("../Modals/Message");


// Create USer
router.post("/create/user",
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('username').isLength({ min: 3 }),
  body('phonenumber').isLength({ min: 10 }),
  async (req, res) => {
    const error = validationResult(req)
    if (!error.isEmpty()) {
      return res.status(400).json(error)
    }
    try {
      let user = await User.findOne({ email: req.body.email })
      if (user) {
        return res.status(400).json('User already exists')
      }
      const salt = bcrypt.genSaltSync(10)
      const hashPwd = bcrypt.hashSync(req.body.password, salt)

      user = await User.create({
        username: req.body.username,
        email: req.body.email,
        password: hashPwd,
        profile: req.body.profile,
        phonenumber: req.body.phonenumber,
        avatar: req.body.avatar || '',
        coverImage: req.body.coverImage,
        bio: req.body.bio,
        relationship: req.body.relationship

      })
      // const accessToken = jwt.sign({
      //   id: user._id,
      //   username: user.username
      // }, JWTKEY)
      const OTP = generateOTP()
      const verificationToken = await VerificationToken.create({
        user: user._id,
        token: OTP
      })
      verificationToken.save()
      await user.save();
      const transport = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        auth: {
          user: process.env.USER,
          pass: process.env.PASSWORD
        }
      });

      transport.sendMail({
        from: "sociaMedia@gmail.com",
        // from: '"Fred Foo 👻" <foo@example.com>', // Đặt địa chỉ email của bạn ở đây
        to: user.email,
        subject: "Verify your email using OTP",
        html: `<h1>Your OTP is ${OTP}</h1>`,
      }, (error, info) => {
        if (error) {
          console.error(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });

      res.status(200).json({ Status: "Pending", mgs: "Please check email", user: user._id })
    } catch (error) {
      return res.status(400).json("Internal error occured")
    }
  })

// Verify email
router.post("/verify/email", async (req, res) => {
  const { user, OTP } = req.body;
  const mainuser = await User.findById(user);
  if (!mainuser) return res.status(400).json("User not found");
  if (mainuser.verifed === true) {
    return res.status(400).json("User already verifed")
  };
  const token = await VerificationToken.findOne({ user: mainuser._id });
  if (!token) {
    return res.status(400).json("Sorry token not found")
  }
  const isMatch = await bcrypt.compareSync(OTP, token.token);
  if (!isMatch) { return res.status(400).json("Token is not valid") };

  mainuser.verifed = true;
  await VerificationToken.findByIdAndDelete(token._id);
  await mainuser.save();
  const accessToken = jwt.sign({
    id: mainuser._id,
    username: mainuser.username
  }, JWTKEY);
  const { password, ...other } = mainuser._doc;
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    auth: {
      user: process.env.USER,
      pass: process.env.PASS
    }
  });
  transport.sendMail({
    from: "sociaMedia@gmail.com",
    to: mainuser.email,
    subject: "Successfully verify your email",
    html: `Now you can login in social app`
  })
  return res.status(200).json({ other, accessToken })

})

// Login
router.post("/login",
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const error = validationResult(req)
    if (!error.isEmpty()) {
      return res.status(400).json(error)
    }

    try {
      const user = await User.findOne({ email: req.body.email })
      if (!user) {
        return res.status(400).json("email doesn't found")
      }
      const ComparePassword = await bcrypt.compare(req.body.password, user.password)
      if (!ComparePassword) {
        return res.status(400).json("password doesn't match")
      }
      const accessToken = jwt.sign({
        id: user._id,
        username: user.username
      }, JWTKEY)
      const { password, ...other } = user._doc
      res.status(200).json({
        other, accessToken
      })

    } catch (error) {
      return res.status(500).json('Internal error occured1')
    }
  }
)

//Forgot password
router.post("/forgot/password", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email });
  if (!user) {
    return res.status(400).json("User not found");
  }
  const token = await ResetToken.findOne({ user: user._id });
  if (token) {
    return res.status(400).json("After one hour you can request for another token");
  }

  const RandomTxt = crypto.randomBytes(20).toString('hex');
  const resetToken = new ResetToken({
    user: user._id,
    token: RandomTxt
  });
  await resetToken.save();
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    auth: {
      user: process.env.USER,
      pass: process.env.PASS
    }
  });
  transport.sendMail({
    from: "sociaMedia@gmail.com",
    to: user.email,
    subject: "Reset Token",
    html: `http://localhost:3000/reset/password?token=${RandomTxt}&_id=${user._id}`
  })

  return res.status(200).json("Check your email to reset password")

})

//reset password
router.put("/reset/password", async (req, res) => {
  const { token, _id } = req.query;
  if (!token || !_id) {
    return res.status(400).json("Invalid req");
  }
  const user = await User.findOne({ _id: _id });
  if (!user) {
    return res.status(400).json("user not found")
  }
  const resetToken = await ResetToken.findOne({ user: user._id });
  if (!resetToken) {
    return res.status(400).json("Reset token is not found")
  }
  const isMatch = await bcrypt.compareSync(token, resetToken.token);
  if (!isMatch) {
    return res.status(400).json("Token is not valid");
  }

  const { password } = req.body;
  // const salt = await bcrypt.getSalt(10);
  const secpass = await bcrypt.hash(password, 10);
  user.password = secpass;
  await user.save();
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    service: "gmail",
    auth: {
      user: process.env.USER,
      pass: process.env.PASS
    }
  });
  transport.sendMail({
    from: "sociaMedia@gmail.com",
    to: user.email,
    subject: "Your password reset successfully",
    html: `Now you can login with new password`
  })

  return res.status(200).json("Email has been send")

})

// Change password
router.post("/changePwd",
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('newPassword').isLength({ min: 6 }),

  async (req, res) => {
    const error = validationResult(req)
    if (!error.isEmpty()) {
      return res.status(400).json(error)
    }
    try {
      const user = await User.findOne({ email: req.body.email })
      if (!user) {
        return res.status(400).json("email dosen't found")
      }
      const ComparePassword = await bcrypt.compare(req.body.password, user.password)
      if (!ComparePassword) {
        return res.status(400).json("password doesn't match")
      }
      const salt = bcrypt.genSaltSync(10)
      const hashedPwd = bcrypt.hashSync(req.body.password, salt)
      user.password = hashedPwd
      await user.save()
      res.status(200).json("Password changed successfully")
    } catch (error) {
      return res.status(500).json('Internal error occured')
    }
  })

// Follow
router.put('/following/:id', verifyToken, async (req, res) => {
  if (req.params.id !== req.user.id) {
    const user = await User.findById(req.user.id)
    const otherUser = await User.findById(req.params.id)
    if (!user.Following.includes(req.params.id)) {
      await user.updateOne({ $push: { Following: req.params.id } })
      await otherUser.updateOne({ $push: { Followers: req.user.id } })
      res.status(200).json("user has  followed")
    } else {
      await user.updateOne({ $pull: { Following: req.params.id } })
      await otherUser.updateOne({ $pull: { Followers: req.user.id } })
      res.status(200).json("user has  unfollowed")
    }
  }
  else {
    res.status(400).json("you can't follow yourself")
  }
})

// Update profile user
router.put('/updateProfile', verifyToken, async (req, res) => {
  try {
    if (req.body.password) {
      const salt = bcrypt.genSaltSync(10)
      const secPwd = bcrypt.hashSync(req.body.password, salt)
      req.body.password = secPwd
      const updatePws = await User.findByIdAndUpdate(req.user.id, {
        $set: req.body
      })
      res.status(200).json(updatePws)
    }
    else {
      const updateProfile = await User.findByIdAndUpdate(req.user.id, {
        $set: req.body
      })
      res.status(200).json(updateProfile)
    }

  } catch (error) {
    return res.status(500).json("Internal error occured")
  }
})

// Delete account user
router.delete('/delete/account', verifyToken, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id)
    return res.status(200).json("Account has been deleted")
  } catch (error) {
    return res.status(500).json("Internal error occured")
  }
})

// Get user details for post
router.get('/post/user/details/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(500).json("User not found")
    }
    const { email, password, phonenumber, Followers, Following, ...others } = user._doc
    return res.status(200).json(others)
  } catch (error) {
    return res.status(500).json("Internal error occured")
  }
})

// get user to follow
router.get("/allUser", verifyToken, async (req, res) => {
  try {
    const user = await User?.findById(req.user.id)
    const users = await User?.find({ _id: { $nin: [req.user.id, ...user?.Following] } })
      .sort({ username: 1 })
    let filterUser = await Promise.all(
      users.map(async (user) => {
        const { email, Followers, Following, password, phonenumber, ...others } = user._doc
        return others
      })
    )
    res.status(200).json(filterUser)
  } catch (error) {
    return res.status(500).json("Internal error occured")

  }
})

// Get followings user 

router.get("/followings/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    const users = await User.find({ _id: { $in: user?.Following } })
    let filterUser = await Promise.all(
      users.map(async (user) => {
        const { email, Followers, Following, password, phonenumber, ...others } = user._doc
        return others
      })
    )
    res.status(200).json(filterUser)
  } catch (error) {
    return res.status(500).json("Internal error occured")

  }
})

// Get followers user 
router.get("/followers", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    const users = await User.find({ _id: { $in: user?.Followers } })
    let filterUser = await Promise.all(
      users.map(async (user) => {
        const { email, Followers, Following, password, phonenumber, ...others } = user._doc
        return others
      })
    )
    res.status(200).json(filterUser)
  } catch (error) {
    return res.status(500).json("Internal error occured")

  }

})

// Get profile 
router.get("/profile/:id", async (req, res) => {
  try {
    const profileUser = await User.findById(req.params.id).populate({
      path: 'Followers',
      model: "User",
      select: "avatar username"
    }).populate({
      path: 'Following',
      model: "User",
      select: "avatar username"
    })
    const { email, password, phonenumber, ...others } = profileUser._doc
    res.status(200).json(others)
  } catch (error) {
    return res.status(500).json("Internal error occured")

  }
})

// Get notification
router.get("/notification", verifyToken, async (req, res) => {
  try {
    const notification = await Notification.find({ user: req.user.id })
      .populate({
        path: 'user',
        model: "User",
        select: "avatar username"
      })
      .populate({
        path: 'userPost',
        model: 'User',
        select: "avatar username"
      }).sort({ createdAt: -1 })
    // .exec()
    res.status(200).json(notification)
  } catch (error) {
    return res.status(500).json("Internal error occured")
  }
})

//  Update notification post 
router.put("/notification/:id", verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    )
    res.status(200).json(notification)
  } catch (error) {
    return res.status(500).json("Internal error occured")
  }
})

// Check all notification 
router.put("/checkNotification", verifyToken, async (req, res) => {
  try {
    const notification = await Notification.updateMany(
      { user: req.user.id },
      { $set: { active: true } }
    )
    res.status(200).json(notification)
  } catch (error) {
    return res.status(500).json("Internal error occured")
  }
})

// Get friends
router.get('/allFriend', verifyToken, async (req, res) => {
  try {
    const userData = await User.findById(req.user.id).populate({
      path: 'friends',
      model: "User",
      select: "avatar username"
    });

    const friendsWithMessages = await Promise.all(
      userData?.friends?.map(async (friend) => {
        const { _id, username, avatar } = friend._doc;
        const messages = await Message.findOne({
          chatUsers: { $all: [req.user.id, _id.toString()] }
        }).sort({ updatedAt: -1 });

        return { _id, username, avatar, messages: messages };
      })
    );

    res.status(200).json(friendsWithMessages);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal error occurred");
  }
});

// Add friend
router.put('/addFriend/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    const friend = await User.findById(req.params.id)
    const check = await user.addFriends.includes(req.params.id)
    if (!check) {
      await user.updateOne({ $push: { addFriends: req.params.id } })
      await friend.updateOne({ $push: { friendRequest: req.user.id } })
      res.status(200).json("Friend added")
    }
  } catch (error) {
    return res.status(500).json("Internal error occured")
  }
})

// Cancel add friend
router.get('/rejectFriend/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    const friend = await User.findById(req.params.id)
    const check = await user.addFriends.includes(req.params.id)
    if (check) {
      await user.updateOne({ $pull: { addFriends: req.params.id } })
      await friend.updateOne({ $pull: { friendRequest: req.user.id } })
      res.status(200).json("reject Friend")
    }
  } catch (error) {
    return res.status(500).json("Internal error occured")
  }
})

// Accept request Friend
router.put('/acceptFriend/:id', verifyToken, async (req, res) => {
  // try {
  const user = await User.findById(req.user.id)
  const friend = await User.findById(req.params.id)
  const check = await user.friendRequest.includes(req.params.id)
  if (check) {
    await user.updateOne({
      $pull: { friendRequest: req.params.id },
      $push: { friends: req.params.id }
    })
    await friend.updateOne({
      $pull: { addFriends: req.user.id },
      $push: { friends: req.user.id }
    })
    res.status(200).json("Accept Request friend!")
  }
  // } catch (error) {
  //   return res.status(500).json("Internal error occured")
  // }
})

// Delete request Friend
router.put('/deleteRequestFriend/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    const friend = await User.findById(req.params.id)
    const check = await user.friendRequest.includes(req.params.id)
    if (check) {
      await user.updateOne({ $pull: { friendRequest: req.params.id } })
      await friend.updateOne({ $pull: { addFriends: req.user.id } })
      res.status(200).json("Delete Request friend!")
    }
  } catch (error) {
    return res.status(500).json("Internal error occured")
  }
})

// Delete friend
router.get('/deleteFriend/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    const friend = await User.findById(req.params.id)
    const check = await user.friends.includes(req.params.id)
    if (check) {
      await user.updateOne({ $pull: { friends: req.params.id } })
      await friend.updateOne({ $pull: { friends: req.user.id } })
      res.status(200).json("Friend deleted")
    }
  } catch (error) {
    return res.status(500).json("Internal error occurred")
  }
})

// Get Suggestions Friend
router.get("/suggestions", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const friendSuggestions = await Promise.all(
      user?.friends?.map(async (friendId) => {
        const friend = await User.findById(friendId).populate({
          path: 'friends',
          model: "User",
          select: "avatar username"
        });
        const { friends, ...friendData } = friend._doc;

        return { ...friendData, friends };
      })
    );

    // Hợp nhất danh sách bạn bè từ tất cả các phần tử thành một danh sách duy nhất
    const mergedFriendSuggestions = friendSuggestions.reduce((acc, curr) => {
      acc.push(...curr.friends);
      return acc;
    }, []);

    // Lọc ra những người bạn mà không bao gồm chính bạn và bạn bè của bạn
    const filteredFriendSuggestions = mergedFriendSuggestions.filter(
      friend => !user.friends.includes(friend._id.toString()) && friend._id.toString() !== req.user.id.toString()
    );
    const uniqueIds = [...new Set(filteredFriendSuggestions.map(o => o._id.toString()))];
    const filtered = filteredFriendSuggestions.filter(({ _id }) =>
      uniqueIds.includes(_id.toString()) &&
      !user.addFriends.includes(_id.toString())
    );

    res.status(200).json(filtered);
  } catch (error) {
    return res.status(500).json("Lỗi nội bộ xảy ra");
  }
});

// Get friend request
router.get('/friendRequest', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    const friendRequest = await User.find({ _id: { $in: user?.friendRequest } })
    let filterUser = await Promise.all(
      friendRequest.map(async (user) => {
        const { _id, username, avatar } = user._doc
        return { _id, username, avatar }
      })
    )
    res.status(200).json(filterUser)
  } catch (error) {
    return res.status(500).json("Internal error occured")
  }
})

// Get user request friend
router.get('/yourRequests', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    const friendRequest = await User.find({ _id: { $in: user?.addFriends } })
    let filterUser = await Promise.all(
      friendRequest.map(async (user) => {
        const { _id, username, avatar } = user._doc
        return { _id, username, avatar }
      })
    )
    res.status(200).json(filterUser)
  } catch (error) {
    return res.status(500).json("Internal error occured")
  }
})




module.exports = router
