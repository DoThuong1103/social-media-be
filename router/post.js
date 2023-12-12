const router = require("express").Router();
const Notification = require("../Modals/Notification");
const Post = require("../Modals/Post");
const User = require("../Modals/User");
const { verifyToken } = require("./verifyToken");


function organizeComments(comments, parentId = null) {
  const organizedComments = [];
  comments.forEach(comment => {
    if (!comment.cmtMain && parentId === null) {
      // Comment cha cấp cao nhất
      const topLevelComment = {
        user: comment.user,
        _id: comment._id,
        comment: comment.comment,
        createdAt: comment.createdAt,
        cmtMain: null,
        replies: organizeComments(comments, comment._id.toString())
      };
      organizedComments.push(topLevelComment);
    } else if (comment.cmtMain && comment.cmtMain.equals(parentId)) {
      const nestedComment = {
        user: comment.user,
        comment: comment.comment,
        createdAt: comment.createdAt,
        _id: comment._id,
        cmtMain: comment.cmtMain,
        replies: organizeComments(comments, comment._id)
      };
      organizedComments.push(nestedComment);
    }
  });
  return organizedComments;
}


// Create post
router.post("/user/post", verifyToken, async (req, res) => {
  try {
    let { title, images, video, group } = req.body;
    let newPost = new Post({
      title,
      images,
      video,
      group,
      user: req.user.id,
    });
    const post = await newPost.save()
    res.status(200).json("Post has been posted!");
  } catch (error) {
    return res.status(500).json(error);
  }
});

// get user post
router.get('/userPost/:id', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  try {
    const totalPost = await Post.find({ user: req.params.id }).countDocuments();
    const posts = await Post.find({ user: req.params.id }).sort({ createdAt: -1 })
      .populate({
        path: "user",
        model: 'User',
        select: "username avatar"
      })
      .populate({
        path: "comments",
        populate: {
          path: "user",
          model: "User",
          select: "user avatar username"
        }
      })
      .skip((page - 1) * pageSize)
      .limit(pageSize);
    const result = posts.map(post => {
      const result = { ...post._doc }
      result.countComment = result.comments.length
      result.comments = organizeComments(post.comments)
      return result
    });
    res.status(200).json({ result, totalPost })
  } catch (error) {
    return res.status(500).json("Internal error occuerd")

  }
})

// Get all image user 
router.get('/images/:id', async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.id })
    const images = await Promise.all(
      posts.map(async (post) => {
        return post.images
      })
    )
    res.status(200).json(images);
  } catch (error) {
    return res.status(500).json("Internal error occurred");
  }
});

// update post
router.put('/update/post/:id', verifyToken, async (req, res) => {
  try {
    let post = await Post.findById(req.params.id)
    if (!post) {
      return res.status(400).json("No post found")
    }
    post = await Post.findByIdAndUpdate(req.params.id, {
      $set: req.body
    })
    let updatePost = await post.save()
    res.status(200).json(updatePost)

  }
  catch (error) {
    return res.status(500).json("Internal error occuerd")
  }
})

// Like & Dislike Post
router.put("/:id/like", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    if (!post.like.includes(req.user.id)) {
      await post.updateOne({ $push: { like: req.user.id } })
      if (post.dislike.includes(req.user.id)) {
        await post.updateOne({ $pull: { dislike: req.user.id } })
      }
      res.status(200).json("Post has been liked")
    }
    else {
      await post.updateOne({ $pull: { like: req.user.id } })
      res.status(200).json("Post has been unLiked")
    }

  } catch (error) {
    return res.status(500).json("Internal error occured")
  }
})

// Dislike Post
router.put("/:id/dislike", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    if (!post.dislike.includes(req.user.id)) {
      await post.updateOne({ $push: { dislike: req.user.id } })
      if (post.like.includes(req.user.id)) {
        await post.updateOne({ $pull: { like: req.user.id } })
      }
      res.status(200).json(post)
    }
    else {
      await post.updateOne({ $pull: { dislike: req.user.id } })
      res.status(200).json("Post has been unDisliked")
    }
  }
  catch {
    return res.status(500).json("Internal error occured")
  }
})

// Comment

router.put("/comment", verifyToken, async (req, res) => {
  try {
    const { content, postId, userId, cmtMain, userIdCmt } = req.body;
    function organizeComments(comments, parentId = null) {
      const organizedComments = [];
      comments.forEach(comment => {
        if (!comment.cmtMain && parentId === null) {
          // Comment cha cấp cao nhất
          const topLevelComment = {
            _id: comment._id,
            user: comment.user,
            comment: comment.comment,
            createdAt: comment.createdAt,
            cmtMain: null,
            replies: organizeComments(comments, comment._id)
          };
          organizedComments.push(topLevelComment);
        } else if (comment.cmtMain && comment.cmtMain.equals(parentId)) {
          const nestedComment = {
            _id: comment._id,
            user: comment.user,
            comment: comment.comment,
            createdAt: comment.createdAt,
            cmtMain: comment.cmtMain,
            replies: organizeComments(comments, comment._id)
          };
          organizedComments.push(nestedComment);
        }
      });
      return organizedComments;
    }
    const comment = {
      user: req.user.id,
      cmtMain: cmtMain,
      comment: content
    }

    const post = await Post.findOneAndUpdate(
      { _id: postId },
      { $push: { comments: comment } },
      { new: true }
    );
    if (userIdCmt && userIdCmt !== req.user.id) {
      const newNotification = await Notification.create({
        user: userIdCmt,
        postId: postId,
        userPost: req.user.id,
        content: cmtMain ? 'commented on your comment!' : 'commented on your post!'
      })
    }
    if (!post) {
      return res.status(400).json("Không tìm thấy bài viết");
    }


    let dataComments = await Post.findById(postId)
      .sort({ createdAt: -1 })
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          model: "User",
          select: "avatar username"
        },
      })
    dataComments.comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const result = { ...dataComments._doc }
    result.countComment = result.comments.length
    result.comments = await organizeComments(dataComments.comments)
    res.status(200).json(result)
  } catch (error) {
    return res.status(500).json("Internal error occured")
  }
});


// Get cmt 
router.get("/comments/:id", async (req, res) => {
  try {
    // Hàm để tổ chức comments thành cấu trúc lồng nhau
    // Hàm để tổ chức comments thành cấu trúc lồng nhau
    function organizeComments(comments, parentId = null) {
      const organizedComments = [];
      comments.forEach(comment => {
        if (!comment.cmtMain && parentId === null) {
          // Comment cha cấp cao nhất
          const topLevelComment = {
            user: comment.user,
            comment: comment.comment,
            createdAt: comment.createdAt,
            cmtMain: null,
            replies: organizeComments(comments, comment._id)
          };
          organizedComments.push(topLevelComment);
        } else if (comment.cmtMain && comment.cmtMain.equals(parentId)) {
          const nestedComment = {
            user: comment.user,
            comment: comment.comment,
            createdAt: comment.createdAt,
            cmtMain: comment.cmtMain,
            replies: organizeComments(comments, comment._id)
          };
          organizedComments.push(nestedComment);
        }
      });
      return organizedComments;
    }

    const dataComments = await Post.findById(req.params.id).populate({
      path: 'comments',
      populate: {
        path: 'user',
        model: "User",
        select: "avatar username"
      }
    });

    const result = { ...dataComments._doc }
    result.countComment = result.comments.length
    result.comments = await organizeComments(dataComments.comments)
    res.status(200).json(result)
  } catch (error) {
    return res.status(500).json(error)
  }
})

// Get all post 
router.get("/allPost", verifyToken, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;

  try {
  function organizeComments(comments, parentId = null) {
    const organizedComments = [];
    comments.forEach(comment => {
      if (!comment.cmtMain && parentId === null) {
        const topLevelComment = {
          user: comment.user,
          _id: comment._id,
          comment: comment.comment,
          createdAt: comment.createdAt,
          cmtMain: null,
          replies: organizeComments(comments, comment._id.toString())
        };
        organizedComments.push(topLevelComment);
      } else if (comment.cmtMain && comment.cmtMain.equals(parentId)) {
        const nestedComment = {
          user: comment.user,
          comment: comment.comment,
          createdAt: comment.createdAt,
          _id: comment._id,
          cmtMain: comment.cmtMain,
          replies: organizeComments(comments, comment._id)
        };
        organizedComments.push(nestedComment);
      }
    });
    return organizedComments;
  }

  const user = await User.findById(req.user.id);

  const userGroups = user.group.map(group => group.toString());

  const totalPost = await Post.countDocuments();
  const posts = await Post.find().sort({ createdAt: -1 })
    .populate({
      path: "user",
      model: 'User',
      select: "username avatar"
    })
    .populate({
      path: "comments",
      populate: {
        path: "user",
        model: "User",
        select: "user avatar username"
      }
    })
    .populate({
      path: "group",
      model: "Group",
      select: "groupName coverImage"
    })
    .skip((page - 1) * pageSize)
    .limit(pageSize);

  const result = posts.reduce((acc, post) => {
    // Check if the post has a groupId
    if (!post.group || userGroups.includes(post.group._id.toString())) {
      const postResult = { ...post._doc };
      postResult.countComment = postResult.comments.length;
      postResult.comments = organizeComments(post.comments);
      acc.push(postResult);
    }
    return acc;
  }, []);

  res.status(200).json({ result, totalPost });
  } catch (error) {
    return res.status(500).json("Internal error occurred");
  }
});

// Get posts group
router.get("/postsGroup/:id", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  try {
    function organizeComments(comments, parentId = null) {
      const organizedComments = [];
      comments.forEach(comment => {
        if (!comment.cmtMain && parentId === null) {
          // Comment cha cấp cao nhất
          const topLevelComment = {
            user: comment.user,
            _id: comment._id,
            comment: comment.comment,
            createdAt: comment.createdAt,
            cmtMain: null,
            replies: organizeComments(comments, comment._id.toString())
          };
          organizedComments.push(topLevelComment);
        } else if (comment.cmtMain && comment.cmtMain.equals(parentId)) {
          const nestedComment = {
            user: comment.user,
            comment: comment.comment,
            createdAt: comment.createdAt,
            _id: comment._id,
            cmtMain: comment.cmtMain,
            replies: organizeComments(comments, comment._id)
          };
          organizedComments.push(nestedComment);
        }
      });
      return organizedComments;
    }
    const totalPost = await Post.find({ group: req.params.id }).countDocuments()
    const posts = await Post.find({ group: req.params.id }).sort({ createdAt: -1 })
      .populate({
        path: "user",
        model: 'User',
        select: "username avatar"
      })
      .populate({
        path: "comments",
        populate: {
          path: "user",
          model: "User",
          select: "user avatar username"
        }
      })
      .populate({
        path: "group",
        model: "Group",
        select: "groupName coverImage"
      })
      .skip((page - 1) * pageSize)
      .limit(pageSize);
    // posts.forEach(post => {
    //   post.comments.sort((a, b) => b.createdAt - a.createdAt);
    // });
    const result = posts.map(post => {
      const result = { ...post._doc }
      result.countComment = result.comments.length
      result.comments = organizeComments(post.comments)
      return result
    });
    res.status(200).json({ result, totalPost })
  } catch (error) {
    return res.status(500).json("Internal error occured")
  }
})

// Get posts on user groups
router.get("/allPostGroups", verifyToken, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;

  try {
  function organizeComments(comments, parentId = null) {
    const organizedComments = [];
    comments.forEach(comment => {
      if (!comment.cmtMain && parentId === null) {
        const topLevelComment = {
          user: comment.user,
          _id: comment._id,
          comment: comment.comment,
          createdAt: comment.createdAt,
          cmtMain: null,
          replies: organizeComments(comments, comment._id.toString())
        };
        organizedComments.push(topLevelComment);
      } else if (comment.cmtMain && comment.cmtMain.equals(parentId)) {
        const nestedComment = {
          user: comment.user,
          comment: comment.comment,
          createdAt: comment.createdAt,
          _id: comment._id,
          cmtMain: comment.cmtMain,
          replies: organizeComments(comments, comment._id)
        };
        organizedComments.push(nestedComment);
      }
    });
    return organizedComments;
  }

  const user = await User.findById(req.user.id);

  const userGroups = user.group.map(group => group.toString());

  const totalPost = await Post.find({ group: { $in: user.group } }).countDocuments();
  const posts = await Post.find({ group: { $in: user.group } }).sort({ createdAt: -1 })
    .populate({
      path: "user",
      model: 'User',
      select: "username avatar"
    })
    .populate({
      path: "comments",
      populate: {
        path: "user",
        model: "User",
        select: "user avatar username"
      }
    })
    .populate({
      path: "group",
      model: "Group",
      select: "groupName coverImage"
    })
    .skip((page - 1) * pageSize)
    .limit(pageSize);

  const result = posts.map(post => {
    const result = { ...post._doc }
    result.countComment = result.comments.length
    result.comments = organizeComments(post.comments)
    return result
  });

  res.status(200).json({ result, totalPost });
  } catch (error) {
    return res.status(500).json("Internal error occurred");
  }
});

// Get posts video
router.get('/videos', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  try {
    const totalPost = await Post.find({ video: { $exists: true, $ne: null } }).countDocuments()
    const postsWithVideos = await Post.find({ video: { $exists: true, $ne: null } })
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        model: 'User',
        select: "username avatar"
      })
      .populate({
        path: "comments",
        populate: {
          path: "user",
          model: "User",
          select: "user avatar username"
        }
      })
      .skip((page - 1) * pageSize)
      .limit(pageSize);
    const result = postsWithVideos.map(post => {
      const result = { ...post._doc }
      result.countComment = result.comments.length
      result.comments = organizeComments(post.comments)
      return result
    });
    res.status(200).json({ result, totalPost });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal error occurred" });
  }
})

// Delete post 
router.delete('/delete/post/:id', verifyToken, async (req, res) => {
  try {

    const post = await Post.findOne({ _id: req.params.id, user: req.user.id })
    if (post) {

      await post.deleteOne()
      res.status(200).json("Post has been deleted")
    }
    else {
      return res.status(400).json("No post found")
    }
  }
  catch (error) {
    return res.status(500).json("Internal error occured")
  }
})

// Get content post
router.get('/:id', async (req, res) => {
  try {
    function organizeComments(comments, parentId = null) {
      const organizedComments = [];
      comments.forEach(comment => {
        if (!comment.cmtMain && parentId === null) {
          // Comment cha cấp cao nhất
          const topLevelComment = {
            user: comment.user,
            _id: comment._id,
            comment: comment.comment,
            createdAt: comment.createdAt,
            cmtMain: null,
            replies: organizeComments(comments, comment._id.toString())
          };
          organizedComments.push(topLevelComment);
        } else if (comment.cmtMain && comment.cmtMain.equals(parentId)) {
          const nestedComment = {
            user: comment.user,
            comment: comment.comment,
            createdAt: comment.createdAt,
            _id: comment._id,
            cmtMain: comment.cmtMain,
            replies: organizeComments(comments, comment._id)
          };
          organizedComments.push(nestedComment);
        }
      });
      return organizedComments;
    }
    const post = await Post.findById(req.params.id)
      .populate({
        path: "user",
        model: 'User',
        select: "username avatar"
      })
      .populate({
        path: "comments",
        populate: {
          path: "user",
          model: "User",
          select: "user avatar username"
        }
      })
    post?.comments?.sort((a, b) => b.createdAt - a.createdAt);
    const result = { ...post._doc }
    result.countComment = result?.comments?.length
    result.comments = organizeComments(post?.comments)
    res.status(200).json(result)
  } catch (error) {
    return res.status(500).json("Internal error occuerd")
  }
})

module.exports = router;
