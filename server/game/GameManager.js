const { v4: uuidv4 } = require('uuid');
const TienLenGame = require('./games/TienLenGame');
const SamLocGame = require('./games/SamLocGame');
const CoVayGame = require('./games/CoVayGame');
const CoVuaGame = require('./games/CoVuaGame');

class GameManager {
  constructor() {
    this.rooms = new Map(); // roomId -> room
  }

  createRoom(gameType, hostId, hostUsername) {
    const roomId = uuidv4();
    const room = {
      id: roomId,
      gameType,
      hostId,
      status: 'waiting', // waiting, playing, finished
      players: [{ id: hostId, username: hostUsername }],
      // Tiến lên: min 2, max 4
      // Sâm lốc: min 2, max 4
      // Cờ vây: min 2, max 2
      // Cờ vua: min 2, max 2
      minPlayers: (gameType === 'tienlen' || gameType === 'samloc') ? 2 : 2,
      maxPlayers: (gameType === 'tienlen' || gameType === 'samloc') ? 4 : 2,
      gameState: null,
      createdAt: new Date()
    };

    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  getRooms() {
    // Chỉ hiển thị các phòng đang chờ (waiting) trong lobby
    return Array.from(this.rooms.values()).filter(room => room.status === 'waiting');
  }

  addPlayerToRoom(roomId, player) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const existingPlayerIndex = room.players.findIndex(p => p.id === player.id);
    if (existingPlayerIndex === -1) {
      // Người chơi mới, kiểm tra xem phòng còn chỗ không
      if (room.players.length >= room.maxPlayers) {
        return false; // Phòng đã đầy
      }
      room.players.push(player);
    } else {
      // Người chơi đã có, cập nhật socketId (trường hợp reconnect)
      room.players[existingPlayerIndex].socketId = player.socketId;
      room.players[existingPlayerIndex].username = player.username; // Cập nhật username nếu có thay đổi
    }
    return true;
  }

  removePlayerFromRoom(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.players = room.players.filter(p => p.id !== userId);
    
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
    } else if (room.hostId === userId && room.players.length > 0) {
      room.hostId = room.players[0].id;
    }
  }

  startGame(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Cho phép start lại từ trạng thái finished hoặc waiting
    if (room.status !== 'waiting' && room.status !== 'finished') return false;
    if (room.players.length < room.minPlayers) return false;

    // Reset game state trước khi bắt đầu ván mới
    room.gameState = null;
    room.winner = null;
    room.status = 'playing';
    
    // Initialize game based on type
    if (room.gameType === 'tienlen') {
      room.gameState = new TienLenGame(room.players);
    } else if (room.gameType === 'samloc') {
      room.gameState = new SamLocGame(room.players);
    } else if (room.gameType === 'covay') {
      room.gameState = new CoVayGame(room.players);
    } else if (room.gameType === 'covua') {
      room.gameState = new CoVuaGame(room.players);
    }

    return true;
  }

  handleGameAction(roomId, userId, action, data) {
    const room = this.rooms.get(roomId);
    if (!room || !room.gameState) {
      return { success: false, error: 'Không tìm thấy phòng hoặc game' };
    }

    const result = room.gameState.handleAction(userId, action, data);
    
    // Check if game is over
    if (result.success && result.data && result.data.gameOver) {
      room.status = 'finished';
      room.winner = result.data.winner;
    }

    return result;
  }

  handleDisconnect(socketId) {
    // Find rooms with disconnected player and remove them
    for (const [roomId, room] of this.rooms.entries()) {
      const player = room.players.find(p => p.socketId === socketId);
      if (player) {
        this.removePlayerFromRoom(roomId, player.id);
        // Notify other players
        return;
      }
    }
  }

  serializeRoom(room, playerId) {
    if (!room) return null;

    const serialized = {
      id: room.id,
      gameType: room.gameType,
      hostId: room.hostId,
      status: room.status,
      players: room.players,
      minPlayers: room.minPlayers,
      maxPlayers: room.maxPlayers,
      createdAt: room.createdAt
    };

    // Thêm winner nếu game đã kết thúc
    if (room.status === 'finished' && room.winner) {
      serialized.winner = room.winner;
    }

    // Serialize game state for the specific player
    if (room.gameState && room.status === 'playing') {
      serialized.gameState = room.gameState.getStateForPlayer(playerId);
    }

    return serialized;
  }
}

module.exports = GameManager;

