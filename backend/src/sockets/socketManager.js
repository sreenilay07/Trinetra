const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const LiveSession = require('../models/LiveSession');
const User = require('../models/User');

let io;

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST']
    }
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));
      
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.user.email})`);

    // Student joins their personal room for direct messages
    socket.join(socket.user._id.toString());

    // Join Exam Room (Student)
    socket.on('join_exam', async ({ examId }) => {
      socket.join(`exam_${examId}`);
      
      if (socket.user.role === 'student') {
        // Create or update LiveSession
        await LiveSession.findOneAndUpdate(
          { studentId: socket.user._id, examId },
          { socketId: socket.id, active: true, lastSeen: Date.now() },
          { upsert: true, new: true }
        );

        // Notify admins/proctors monitoring this exam
        socket.to(`exam_${examId}_admin`).emit('student_connected', {
          studentId: socket.user._id,
          fullName: socket.user.fullName
        });
      }
    });

    // Admin/Author joins monitoring room
    socket.on('monitor_exam', ({ examId }) => {
      if (['admin', 'author'].includes(socket.user.role)) {
        socket.join(`exam_${examId}_admin`);
      }
    });

    // Heartbeat to keep session active
    socket.on('heartbeat', async ({ examId }) => {
      if (socket.user.role === 'student') {
        await LiveSession.findOneAndUpdate(
          { studentId: socket.user._id, examId },
          { lastSeen: Date.now() }
        );
      }
    });

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      if (socket.user.role === 'student') {
        const session = await LiveSession.findOneAndUpdate(
          { socketId: socket.id },
          { active: false }
        );

        if (session) {
          io.to(`exam_${session.examId}_admin`).emit('student_disconnected', {
            studentId: socket.user._id,
            fullName: socket.user.fullName
          });
        }
      }
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    console.warn('Socket.io not initialized!');
  }
  return io;
};

module.exports = { initSocket, getIo };
