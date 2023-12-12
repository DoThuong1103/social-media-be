const router = require("express").Router();
// const Notification = require("../Modals/Notification");
const Group = require("../Modals/Group");
const Post = require("../Modals/Post");
const User = require("../Modals/User");
const { verifyToken } = require("./verifyToken");

router.post('/newGroup', verifyToken, async (req, res) => {
  try {
  const { groupName, privacy, idFriends } = req.body
  const newGroup = await Group.create({
    groupName: groupName,
    privacy: privacy,
    users: {
      user: req.user.id,
      role: 'groupCreator'
    }
  })
  const friends = idFriends ? idFriends : []
  await newGroup.save()
  const users = await User.find({
    _id: {
      $in: [...friends, req.user.id]
    }
  })
  const groupRequest = await Promise.all(
    users.map(async (user) => {
      user?._id.toString() === req.user.id
        ? await user.updateOne({ $push: { group: newGroup._id } })
        : await user.updateOne({ $push: { invitationGroup: newGroup._id.toString() } })
    })
  )
  res.status(200).json(groupRequest)
  } catch (error) {
    return res.status(500).json(error)
  }
})

// Update group
router.put('/updateGroup/:id', verifyToken, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    const admins = group.users.filter(user => user.role === 'admin' || user.role === 'groupCreator')
    const isAdmin = admins.some(user => user.user.toString() === req.user.id)
    if ((req.body.groupName || req.body.coverImage) && isAdmin) {
      const updateGroup = await Group.findByIdAndUpdate(req.params.id, {
        $set: req.body
      })
      res.status(200).json(updateGroup)
    }

    if (req.body.groupName && isAdmin) {
      const updateGroup = await Group.findByIdAndUpdate(req.params.id, {
        $set: req.body
      })
      res.status(200).json(updateGroup)
    }

    else if (req.body.addUser) {
      const updateGroup = await Group.findByIdAndUpdate(req.params.id, {
        $push: {
          users: {
            user: req.user.id,
            role: 'user'
          }
        }
      })
      const user = await User.findById(req.user.id)
      await user.updateOne({
        $push: { group: req.params.id }
      })
      await user.updateOne({
        $pull: { invitationGroup: req.params.id }
      })
      res.status(200).json(user)
    }
    else if (req.body.removeUser && isAdmin) {
      const updateGroup = await Group.findByIdAndUpdate(req.params.id, {
        $pull: {
          users: {
            user: req.body.removeUser
          }
        }
      })
      const user = await User.findById(req.body.removeUser)
      await user.updateOne({ $pull: { group: req.params.id } })
      res.status(200).json(updateGroup)
    }
    else if (req.body.leaveGroup) {
      const updateGroup = await Group.findByIdAndUpdate(req.params.id, {
        $pull: {
          users: {
            user: req.body.leaveGroup
          }
        }
      })
      const user = await User.findById(req.body.leaveGroup)
      await user.updateOne({ $pull: { group: req.params.id } })
      res.status(200).json('Leave group successfully')
    }
    else if (req.body.privacy) {
      const updateGroup = await Group.findByIdAndUpdate(req.params.id, {
        $set: req.body
      })
      res.status(200).json(updateGroup)
    }
    else if (req.body.elevateAdmin) {
      try {
        const groupId = req.params.id;
        const userIdToElevate = req.body.elevateAdmin;

        // Check if the user is already in the group
        const group = await Group.findById(groupId);
        const userIndex = group.users.findIndex(userObj => userObj.user.toString() === userIdToElevate);

        if (userIndex !== -1) {
          // User is in the group, update their role to 'admin'
          group.users[userIndex].role = group.users[userIndex].role === 'admin' ? 'user' : 'admin';

          // Save the updated group
          const updatedGroup = await group.save();

          res.status(200).json(updatedGroup);
        } else {
          res.status(404).json({ error: 'User not found in the group' });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }

  } catch (error) {
    return res.status(500).json(error)
  }
})

// Get all group 
router.get('/allGroup', async (req, res) => {
  try {
    const groups = await Group.find({ privacy: 'public' })
    res.status(200).json(groups)
  } catch (error) {
    return res.status(500).json(error)
  }
})

// Get groups you've joined 
router.get('/joinedGroups', verifyToken, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  try {
  const user = req.user.id;
  const totalGroup = await Group.find({ "users.user": user }).countDocuments()
  const groups = await Group.find({ "users.user": user }).skip((page - 1) * pageSize)
    .limit(pageSize);;
  res.status(200).json({ groups, totalGroup });
  } catch (error) {
    return res.status(500).json("Internal error occurred");
  }
});

// Send invitations to the group
router.post('/sendInvitations', verifyToken, async (req, res) => {
  try {  
  const { groupId, userIds } = req.body;
  // Find the group
  const group = await Group.findById(groupId);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  // Check if the user sending the invitations is a member of the group
  const senderId = req.user.id;
  const isMember = group.users.some(user => user.user.toString() === senderId);
  if (!isMember) {
    return res.status(403).json({ error: 'You are not a member of this group' });
  }

  // Send invitations to the specified users
  const users = await User.find({
    _id: {
      $in: userIds
    }
  })
  const groupRequest = await Promise.all(
    users.map(async (user) => {
      await user.updateOne({ $push: { invitationGroup: groupId } })
    })
  )
  // for (const userId of userIds) {
  //   const user = await User.findById(userId);
  //   if (user) {
  //     user.updateOne({ $push: { invitationGroup: groupId } });
  //     console.log(user);
  //   }
  //   await user.save()
  // }
  return res.status(200).json({ message: 'Invitations sent successfully', groupRequest });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get group detail 
router.get('/groupDetail/:id', verifyToken, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate({
      path: 'users',
      populate: {
        path: "user",
        model: "User",
        select: "avatar username"
      },
    })
    res.status(200).json(group)
  } catch (error) {
    return res.status(500).json(error)
  }
})

// get group invitationGroup 
router.get('/groupInvitation', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'invitationGroup',
      model: "Group",
      select: "groupName coverImage privacy users"

    })
    const { invitationGroup } = user._doc
    res.status(200).json(invitationGroup)
  } catch (error) {
  }
})

// Delete group invitation
router.put('/deleteGroupInvitation/:id', verifyToken, async (req, res) => {
  try {
  const user = await User.findById(req.user.id)
  await user.updateOne({
    $pull: {
      invitationGroup: req.params.id
    }
  })
  res.status(200).json('Delete invitation successfully')
  } catch (error) {
    return res.status(500).json(error)
  }
})

// Get image on group
router.get('/images/:id', async (req, res) => {
  try {
    const posts = await Post.find({ group: req.params.id })
    const images = await Promise.all(
      posts.map(async (post) => {
        return post.images
      })
    )
    res.status(200).json(images)
  } catch (error) {
    return res.status(500).json("Internal error occured");
  }
});

module.exports = router
