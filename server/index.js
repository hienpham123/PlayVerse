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

// Helper function để kiểm tra và trigger bot nếu cần
function checkAndTriggerBot(room, roomId, userId) {
  console.log('[BOT CHECK] Starting check...', {
    hasRoom: !!room,
    hasGameState: !!room?.gameState,
    roomStatus: room?.status,
    gameStateStatus: room?.gameState?.status,
    gameType: room?.gameType
  });
  
  // Kiểm tra room.status thay vì gameState.status (TienLenGame không có status trong gameState)
  if (!room || !room.gameState || room.status !== 'playing') {
    console.log('[BOT CHECK] Room or gameState not available or not playing', {
      hasRoom: !!room,
      hasGameState: !!room?.gameState,
      roomStatus: room?.status
    });
    return;
  }
  
  // Chỉ kiểm tra cho các game hỗ trợ bot
  const botSupportedGames = ['tienlen', 'samloc', 'xo', 'covua'];
  if (!botSupportedGames.includes(room.gameType)) {
    console.log('[BOT CHECK] Not a bot-supported game:', room.gameType);
    return;
  }
  
  // Lấy currentPlayerId từ gameState
  let currentPlayerId = null;
  if (room.gameState.currentPlayerId) {
    currentPlayerId = room.gameState.currentPlayerId;
  } else if (room.gameState.players && typeof room.gameState.currentPlayerIndex === 'number') {
    const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
    if (currentPlayer) {
      currentPlayerId = currentPlayer.id;
    }
  }
  
  console.log('[BOT CHECK] Current player ID:', currentPlayerId, {
    currentPlayerIndex: room.gameState.currentPlayerIndex,
    players: room.gameState.players?.map(p => ({ id: p.id, username: p.username, isBot: p.isBot }))
  });
  
  if (!currentPlayerId) {
    console.log('[BOT CHECK] No currentPlayerId found');
    return;
  }
  
  // Tìm current player trong gameState.players hoặc room.players
  let currentPlayer = null;
  if (room.gameState.players) {
    currentPlayer = room.gameState.players.find(p => p.id === currentPlayerId);
  }
  
  if (!currentPlayer && room.players) {
    currentPlayer = room.players.find(p => p.id === currentPlayerId);
  }
  
  console.log('[BOT CHECK] Current player found:', {
    id: currentPlayer?.id,
    username: currentPlayer?.username,
    isBot: currentPlayer?.isBot,
    bots: room.bots
  });
  
  // Kiểm tra xem player có phải là bot không
  const isBot = currentPlayer?.isBot || (room.bots && room.bots.some(b => b.id === currentPlayerId));
  
  console.log('[BOT CHECK] Is bot?', isBot);
  
  if (isBot && currentPlayerId) {
    console.log('[BOT] ✅ Triggering bot move:', currentPlayerId, 'Game:', room.gameType);
    setTimeout(() => {
      triggerBotMoveAndBroadcast(roomId, currentPlayerId, room.gameType);
    }, 1500);
  } else {
    console.log('[BOT CHECK] ❌ Not a bot or no player ID');
  }
}

// Helper function để bot tự động chơi và broadcast (cần io và gameManager đã được khởi tạo)
function triggerBotMoveAndBroadcast(roomId, botId, gameType) {
  console.log('[BOT] Attempting bot move:', { roomId, botId, gameType });
  
  const botResult = gameManager.handleBotMove(roomId, botId);
  
  if (botResult && botResult.success) {
    console.log('[BOT] Bot move successful:', botResult);
    const updatedRoom = gameManager.getRoom(roomId);
    if (!updatedRoom || !updatedRoom.gameState) {
      console.log('[BOT] Room or gameState not found after bot move');
      return;
    }
    
    // Broadcast bot move to all players
    const socketRoom = io.sockets.adapter.rooms.get(roomId);
    if (socketRoom) {
      socketRoom.forEach((socketId) => {
        const playerSocket = io.sockets.sockets.get(socketId);
        if (playerSocket) {
          const playerId = playerSocket.userId;
          const action = gameType === 'xo' ? 'make-move' : 
                        (gameType === 'tienlen' ? (botResult.data?.passed ? 'pass' : 'play-cards') : 'game-action');
          playerSocket.emit('game-update', {
            room: gameManager.serializeRoom(updatedRoom, playerId),
            action: action,
            data: botResult.data
          });
        }
      });
    }
    
    // Kiểm tra nếu game chưa kết thúc, check xem có bot tiếp theo cần chơi không
    if (!botResult.data?.gameOver && updatedRoom.gameState.status === 'playing') {
      setTimeout(() => {
        const freshRoom = gameManager.getRoom(roomId);
        if (freshRoom) {
          checkAndTriggerBot(freshRoom, roomId, null);
        }
      }, 800);
    }
  } else {
    console.log('[BOT] Bot move failed:', botResult?.error || 'Unknown error');
  }
}

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

    // Kiểm tra xem người chơi đã có trong phòng chưa (player hoặc spectator)
    const existingPlayer = room.players.find(p => p.id === userId);
    const existingSpectator = room.spectators?.find(s => s.id === userId);
    
    // Nếu phòng đang chơi và người này chưa có trong phòng, cho vào làm spectator
    if (room.status === 'playing' && !existingPlayer && !existingSpectator) {
      const canSpectate = ['xo', 'covua', 'covay', 'taixiu'].includes(room.gameType);
      if (canSpectate) {
        socket.userId = userId;
        socket.join(roomId);
        const spectator = { id: userId, username, socketId: socket.id };
        const addSpectatorResult = gameManager.addSpectatorToRoom(roomId, spectator);
        
        if (!addSpectatorResult) {
          socket.emit('error', { message: 'Không thể thêm khán giả vào phòng' });
          return;
        }
        
        const updatedRoom = gameManager.getRoom(roomId);
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
        
        socket.emit('joined-room', { room: gameManager.serializeRoom(updatedRoom, userId), isSpectator: true });
        return;
      } else {
        socket.emit('error', { message: 'Trận đấu đang diễn ra, không thể tham gia' });
        return;
      }
    }
    
    // Nếu chưa có trong phòng và phòng đang chờ, kiểm tra xem phòng còn chỗ không
    if (!existingPlayer && !existingSpectator && room.status === 'waiting') {
      // Kiểm tra lại sau khi lấy room mới nhất để tránh race condition
      const currentRoom = gameManager.getRoom(roomId);
      if (!currentRoom) {
        socket.emit('error', { message: 'Không tìm thấy phòng' });
        return;
      }
      
      // Kiểm tra số lượng người chơi hiện tại so với maxPlayers
      // Nếu đầy, cho phép join làm spectator (chỉ với game 2 người như XO, cờ vua)
      if (currentRoom.players.length >= currentRoom.maxPlayers) {
        const canSpectate = ['xo', 'covua', 'covay'].includes(currentRoom.gameType);
        if (canSpectate) {
          // Cho phép join làm spectator
          socket.userId = userId;
          socket.join(roomId);
          const spectator = { id: userId, username, socketId: socket.id };
          const addSpectatorResult = gameManager.addSpectatorToRoom(roomId, spectator);
          
          if (!addSpectatorResult) {
            socket.emit('error', { message: 'Không thể thêm khán giả vào phòng' });
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
          
          socket.emit('joined-room', { room: gameManager.serializeRoom(updatedRoom, userId), isSpectator: true });
          return;
        } else {
          socket.emit('error', { message: 'Phòng đã đầy' });
          return;
        }
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
    const roomBeforeRemoval = gameManager.getRoom(roomId);
    gameManager.removePlayerFromRoom(roomId, userId);
    
    const updatedRoom = gameManager.getRoom(roomId);
    
    // Nếu room bị xóa (không còn người chơi thật), thông báo cho tất cả clients
    if (!updatedRoom) {
      console.log(`[ROOM] Room ${roomId} deleted, notifying all clients`);
      io.emit('room-deleted', { roomId });
      io.emit('rooms-updated', { rooms: gameManager.getRooms() });
      
      // Nếu người rời phòng vẫn đang ở trong room, yêu cầu họ rời
      socket.emit('room-deleted', { roomId });
    } else {
      // Room vẫn còn, cập nhật cho các player trong room
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
      
      // Cập nhật danh sách rooms cho tất cả clients
      io.emit('rooms-updated', { rooms: gameManager.getRooms() });
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
    
    // Kiểm tra và trigger bot nếu bot đi trước (sau khi broadcast game-started)
    setTimeout(() => {
      checkAndTriggerBot(updatedRoom, roomId, userId);
    }, 2000);
    
    // Kiểm tra và trigger bot nếu cần (sau khi broadcast game-started)
    setTimeout(() => {
      checkAndTriggerBot(updatedRoom, roomId, userId);
    }, 2000);
    
    // Emit rooms-updated để tất cả clients biết phòng đã chuyển sang playing
    io.emit('rooms-updated', { rooms: gameManager.getRooms() });
  });

  socket.on('game-action', ({ roomId, userId, action, data }) => {
    const result = gameManager.handleGameAction(roomId, userId, action, data);
    if (result.success) {
      const updatedRoom = gameManager.getRoom(roomId);
      
      // Nếu là roll-dice hoặc new-round của taixiu, check auto roll
      if (updatedRoom.gameType === 'taixiu' && updatedRoom.gameState) {
        const autoRollResult = updatedRoom.gameState.checkAndAutoRoll();
        if (autoRollResult && autoRollResult.success) {
          // Auto roll đã được thực hiện, broadcast kết quả
          const socketRoom = io.sockets.adapter.rooms.get(roomId);
          if (socketRoom) {
            socketRoom.forEach((socketId) => {
              const playerSocket = io.sockets.sockets.get(socketId);
              if (playerSocket) {
                const playerId = playerSocket.userId || userId;
                playerSocket.emit('game-update', {
                  room: gameManager.serializeRoom(updatedRoom, playerId),
                  action: 'roll-dice',
                  data: autoRollResult.data
                });
              }
            });
          }
          return;
        }
      }
      
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
      
      // Kiểm tra nếu là lượt của bot thì bot tự động chơi (cho tất cả game)
      console.log('[GAME ACTION] Player move completed, checking for bot turn...');
      
      // Lấy lại room sau khi action để có gameState mới nhất
      setTimeout(() => {
        const freshRoom = gameManager.getRoom(roomId);
        console.log('[GAME ACTION] Fresh room after move:', {
          hasRoom: !!freshRoom,
          hasGameState: !!freshRoom?.gameState,
          status: freshRoom?.gameState?.status,
          currentPlayerIndex: freshRoom?.gameState?.currentPlayerIndex,
          players: freshRoom?.gameState?.players?.map(p => ({ id: p.id, username: p.username, isBot: p.isBot }))
        });
        
        if (freshRoom) {
          checkAndTriggerBot(freshRoom, roomId, userId);
        }
      }, 800);
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  socket.on('add-bot', ({ roomId, difficulty }) => {
    const room = gameManager.getRoom(roomId);
    if (!room) {
      socket.emit('error', { message: 'Không tìm thấy phòng' });
      return;
    }

    const result = gameManager.addBotToRoom(roomId, difficulty || 'medium');
    
    if (result.success) {
      const updatedRoom = gameManager.getRoom(roomId);
      // Broadcast room update to all players
      const socketRoom = io.sockets.adapter.rooms.get(roomId);
      if (socketRoom) {
        socketRoom.forEach((socketId) => {
          const playerSocket = io.sockets.sockets.get(socketId);
          if (playerSocket) {
            const playerId = playerSocket.userId;
            playerSocket.emit('room-updated', {
              room: gameManager.serializeRoom(updatedRoom, playerId)
            });
          }
        });
      }
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  socket.on('remove-bot', ({ roomId, botId }) => {
    const room = gameManager.getRoom(roomId);
    if (!room) {
      socket.emit('error', { message: 'Không tìm thấy phòng' });
      return;
    }

    const result = gameManager.removeBotFromRoom(roomId, botId);
    
    if (result.success) {
      const updatedRoom = gameManager.getRoom(roomId);
      // Broadcast room update to all players
      const socketRoom = io.sockets.adapter.rooms.get(roomId);
      if (socketRoom) {
        socketRoom.forEach((socketId) => {
          const playerSocket = io.sockets.sockets.get(socketId);
          if (playerSocket) {
            const playerId = playerSocket.userId;
            playerSocket.emit('room-updated', {
              room: gameManager.serializeRoom(updatedRoom, playerId)
            });
          }
        });
      }
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  socket.on('chat-message', ({ roomId, userId, username, message }) => {
    const room = gameManager.getRoom(roomId);
    if (!room) {
      socket.emit('error', { message: 'Không tìm thấy phòng' });
      return;
    }

    // Kiểm tra xem user có trong room không (player hoặc spectator)
    const isPlayer = room.players.some(p => p.id === userId);
    const isSpectator = room.spectators?.some(s => s.id === userId);
    
    if (!isPlayer && !isSpectator) {
      socket.emit('error', { message: 'Bạn không có trong phòng này' });
      return;
    }

    // Lưu tin nhắn
    if (!room.messages) {
      room.messages = [];
    }
    
    const chatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId,
      username,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      isPlayer,
      isSpectator
    };
    
    room.messages.push(chatMessage);
    
    // Giới hạn số lượng tin nhắn (giữ 100 tin nhắn gần nhất)
    if (room.messages.length > 100) {
      room.messages = room.messages.slice(-100);
    }

    // Gửi tin nhắn đến tất cả mọi người trong room
    const socketRoom = io.sockets.adapter.rooms.get(roomId);
    if (socketRoom) {
      socketRoom.forEach((socketId) => {
        const playerSocket = io.sockets.sockets.get(socketId);
        if (playerSocket) {
          // Emit cả chat-message event riêng và room-updated để đảm bảo messages được sync
          playerSocket.emit('chat-message', chatMessage);
          const playerId = playerSocket.userId || userId;
          playerSocket.emit('room-updated', {
            room: gameManager.serializeRoom(room, playerId)
          });
        }
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Lưu danh sách room IDs trước khi xử lý disconnect để biết room nào bị xóa
    const roomsBeforeDisconnect = Array.from(gameManager.rooms.keys());
    gameManager.handleDisconnect(socket.id);
    const roomsAfterDisconnect = Array.from(gameManager.rooms.keys());
    
    // Tìm các room bị xóa
    const deletedRooms = roomsBeforeDisconnect.filter(roomId => !roomsAfterDisconnect.includes(roomId));
    
    // Thông báo cho tất cả clients về các room bị xóa
    deletedRooms.forEach(roomId => {
      console.log(`[ROOM] Room ${roomId} deleted due to disconnect, notifying all clients`);
      io.emit('room-deleted', { roomId });
    });
    
    // Cập nhật danh sách rooms cho tất cả clients
    io.emit('rooms-updated', { rooms: gameManager.getRooms() });
  });
});

// Interval để check và tự động roll xúc xắc cho taixiu khi hết thời gian, và tự động bắt đầu ván mới
setInterval(() => {
  const rooms = gameManager.getRooms();
  rooms.forEach(room => {
    if (room.gameType === 'taixiu' && room.gameState && room.status === 'playing') {
      // Check tự động roll xúc xắc khi hết thời gian đặt cược
      const autoRollResult = room.gameState.checkAndAutoRoll();
      if (autoRollResult && autoRollResult.success) {
        // Broadcast kết quả auto roll
        const socketRoom = io.sockets.adapter.rooms.get(room.id);
        if (socketRoom) {
          socketRoom.forEach((socketId) => {
            const playerSocket = io.sockets.sockets.get(socketId);
            if (playerSocket) {
              const playerId = playerSocket.userId;
              playerSocket.emit('game-update', {
                room: gameManager.serializeRoom(room, playerId),
                action: 'roll-dice',
                data: autoRollResult.data
              });
            }
          });
        }
      }
      
      // Check tự động bắt đầu ván mới sau khi hiển thị kết quả
      const autoNewRoundResult = room.gameState.checkAndAutoNewRound();
      if (autoNewRoundResult && autoNewRoundResult.success) {
        // Broadcast ván mới
        const socketRoom = io.sockets.adapter.rooms.get(room.id);
        if (socketRoom) {
          socketRoom.forEach((socketId) => {
            const playerSocket = io.sockets.sockets.get(socketId);
            if (playerSocket) {
              const playerId = playerSocket.userId;
              playerSocket.emit('game-update', {
                room: gameManager.serializeRoom(room, playerId),
                action: 'new-round',
                data: autoNewRoundResult.data
              });
            }
          });
        }
      }
    }
  });
}, 1000); // Check mỗi giây

const PORT = process.env.PORT || 2023;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access from other devices: http://YOUR_IP:${PORT}`);
});

