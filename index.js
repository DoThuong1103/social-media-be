const express = require('express');
const mongoose = require('mongoose');
const app = express()
const dotenv = require('dotenv')
const userRouter = require('./router/user')
const postRouter = require('./router/post')
const notificationRouter = require('./router/notification')
const messageRouter = require('./router/message')
const cors = require('cors')
const socket = require('socket.io')
dotenv.config()

mongoose.connect(process.env.MONGOOSEDB_URL).then(() => {
  console.log(
    'Connected to MongoDB'
  );
}).catch(() => {
  console.log('Error connecting to MongoDB');
})
app.use(cors())
app.use(express.json())
app.use('/api/user', userRouter)
app.use('/api/post', postRouter)
app.use('/api/notification', notificationRouter)
app.use('/api/message', messageRouter)

const server = app.listen(5000, () => {
  console.log('Server is running');
})

const io = socket(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true
  }
})

global.onlineUsers = new Map();

function getOnlineUsers() {
  return Array.from(global.onlineUsers.keys());
}
io.on('connection', (socket) => {
  global.chatsocket = socket;
  socket.on("addUser", (id) => {
    global.onlineUsers.set(id, socket.id);
    // Gửi danh sách người dùng online cho tất cả mọi người
    io.emit("onlineUsers", Array.from(global.onlineUsers.keys()));
  });

  socket.on("disconnect", () => {
    const disconnectedUserId = Array.from(global.onlineUsers.entries()).find(([key, value]) => value === socket.id)?.[0];
    global.onlineUsers.delete(socket.id);
    global.onlineUsers.delete(disconnectedUserId);

    // Gửi danh sách người dùng online cho tất cả mọi người khi có người dùng ngắt kết nối
    io.emit("onlineUsers", Array.from(global.onlineUsers.keys()));

    // Gửi thông báo cho tất cả người dùng khác khi có người dùng ngắt kết nối
    socket.broadcast.emit("userDisconnected", disconnectedUserId);
  });

  socket.on('sendMsg', (data) => {
    const sendUserSocket = global.onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit('msg-recieve', data);
    }
  });
});
