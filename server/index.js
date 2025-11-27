const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const GameManager = require('./game/GameManager');
const AuthManager = require('./auth/AuthManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const gameManager = new GameManager();
const authManager = new AuthManager();

// REST API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/login', (req, res) => {
  const { username } = req.body;
  if (!username || username.trim().length === 0) {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  const user = authManager.login(username.trim());
  res.json({ user });
});

app.get('/api/rooms', (req, res) => {
  const rooms = gameManager.getRooms();
  res.json({ rooms });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, userId, username }) => {
    const room = gameManager.getRoom(roomId);
    if (!room) {
      socket.emit('error', { message: 'Không tìm thấy phòng' });
      return;
    }

    // Kiểm tra xem người chơi đã có trong phòng chưa
    const existingPlayer = room.players.find(p => p.id === userId);
    
    // Nếu chưa có trong phòng, kiểm tra xem phòng còn chỗ không
    if (!existingPlayer) {
      // Kiểm tra lại sau khi lấy room mới nhất để tránh race condition
      const currentRoom = gameManager.getRoom(roomId);
      if (!currentRoom) {
        socket.emit('error', { message: 'Không tìm thấy phòng' });
        return;
      }
      
      // Kiểm tra số lượng người chơi hiện tại so với maxPlayers
      if (currentRoom.players.length >= currentRoom.maxPlayers) {
        socket.emit('error', { message: 'Phòng đã đầy' });
        return;
      }
    }

    socket.userId = userId; // Store userId on socket for later use
    socket.join(roomId);
    const player = { id: userId, username, socketId: socket.id };
    const addResult = gameManager.addPlayerToRoom(roomId, player);
    
    if (!addResult) {
      socket.emit('error', { message: 'Không thể thêm người chơi vào phòng' });
      return;
    }
    
    // Kiểm tra lại sau khi thêm để đảm bảo không vượt quá maxPlayers
    const finalRoom = gameManager.getRoom(roomId);
    if (finalRoom && finalRoom.players.length > finalRoom.maxPlayers) {
      // Nếu vượt quá, xóa người chơi vừa thêm
      gameManager.removePlayerFromRoom(roomId, userId);
      socket.leave(roomId);
      socket.emit('error', { message: 'Phòng đã đầy' });
      return;
    }
    
    const updatedRoom = gameManager.getRoom(roomId);
    // Notify all players in room
    const socketRoom = io.sockets.adapter.rooms.get(roomId);
    if (socketRoom) {
      socketRoom.forEach((socketId) => {
        const playerSocket = io.sockets.sockets.get(socketId);
        if (playerSocket) {
          const playerId = playerSocket.userId || userId;
          playerSocket.emit('room-updated', {
            room: gameManager.serializeRoom(updatedRoom, playerId)
          });
        }
      });
    }

    socket.emit('joined-room', { room: gameManager.serializeRoom(updatedRoom, userId) });
  });

  socket.on('leave-room', ({ roomId, userId }) => {
    socket.leave(roomId);
    gameManager.removePlayerFromRoom(roomId, userId);
    
    const updatedRoom = gameManager.getRoom(roomId);
    if (updatedRoom) {
      const socketRoom = io.sockets.adapter.rooms.get(roomId);
      if (socketRoom) {
        socketRoom.forEach((socketId) => {
          const playerSocket = io.sockets.sockets.get(socketId);
          if (playerSocket) {
            const playerId = playerSocket.userId || userId;
            playerSocket.emit('room-updated', {
              room: gameManager.serializeRoom(updatedRoom, playerId)
            });
          }
        });
      }
    }
  });

  socket.on('create-room', ({ gameType, userId, username }) => {
    socket.userId = userId;
    const room = gameManager.createRoom(gameType, userId, username);
    socket.join(room.id);
    
    // Cập nhật socketId cho chủ phòng ngay khi tạo phòng
    const hostPlayer = { id: userId, username, socketId: socket.id };
    gameManager.addPlayerToRoom(room.id, hostPlayer);
    
    const updatedRoom = gameManager.getRoom(room.id);
    const serializedRoom = gameManager.serializeRoom(updatedRoom, userId);
    
    // Emit room-created cho tất cả clients (để hiển thị trong Lobby)
    io.emit('room-created', { room: serializedRoom });
    
    // Emit joined-room cho chủ phòng để tự động vào phòng
    socket.emit('joined-room', { room: serializedRoom });
  });

  socket.on('start-game', ({ roomId, userId }) => {
    const room = gameManager.getRoom(roomId);
    if (!room || room.hostId !== userId) {
      socket.emit('error', { message: 'Chỉ chủ phòng mới có thể bắt đầu game' });
      return;
    }

    if (room.players.length < room.minPlayers) {
      socket.emit('error', { message: 'Chưa đủ người chơi' });
      return;
    }

    gameManager.startGame(roomId);
    const updatedRoom = gameManager.getRoom(roomId);
    // Send personalized game state to each player
    const socketRoom = io.sockets.adapter.rooms.get(roomId);
    if (socketRoom) {
      socketRoom.forEach((socketId) => {
        const playerSocket = io.sockets.sockets.get(socketId);
        if (playerSocket) {
          const playerId = playerSocket.userId || userId;
          playerSocket.emit('game-started', {
            room: gameManager.serializeRoom(updatedRoom, playerId)
          });
        }
      });
    }
  });

  socket.on('game-action', ({ roomId, userId, action, data }) => {
    const result = gameManager.handleGameAction(roomId, userId, action, data);
    if (result.success) {
      const updatedRoom = gameManager.getRoom(roomId);
      // Send personalized game state to each player in the room
      const socketRoom = io.sockets.adapter.rooms.get(roomId);
      if (socketRoom) {
        socketRoom.forEach((socketId) => {
          const playerSocket = io.sockets.sockets.get(socketId);
          if (playerSocket) {
            const playerId = playerSocket.userId || userId;
            playerSocket.emit('game-update', {
              room: gameManager.serializeRoom(updatedRoom, playerId),
              action,
              data: result.data
            });
          }
        });
      }
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    gameManager.handleDisconnect(socket.id);
    io.emit('rooms-updated', { rooms: gameManager.getRooms() });
  });
});

const PORT = process.env.PORT || 2023;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access from other devices: http://YOUR_IP:${PORT}`);
});

