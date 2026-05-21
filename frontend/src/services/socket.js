import { io } from 'socket.io-client';

let socket = null;

export const initiateSocketConnection = (token) => {
  if (socket) return socket;
  
  socket = io('http://localhost:5000', {
    auth: {
      token,
    },
    transports: ['websocket'],
  });
  
  console.log('Connecting socket...');
  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    console.log('Disconnecting socket...');
    socket.disconnect();
    socket = null;
  }
};

export const joinExamRoom = (examId) => {
  if (socket) {
    socket.emit('join_exam', { examId });
  }
};

export const monitorExamRoom = (examId) => {
  if (socket) {
    socket.emit('monitor_exam', { examId });
  }
};

export const sendHeartbeat = (examId) => {
  if (socket) {
    socket.emit('heartbeat', { examId });
  }
};
