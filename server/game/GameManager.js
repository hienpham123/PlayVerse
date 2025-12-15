const { v4: uuidv4 } = require('uuid');
const TienLenGame = require('../games/TienLen/TienLenGame');
const SamLocGame = require('../games/SamLoc/SamLocGame');
const CoVayGame = require('../games/CoVay/CoVayGame');
const CoVuaGame = require('../games/CoVua/CoVuaGame');
const XOGame = require('../games/XO/XOGame');
const TaiXiuGame = require('../games/TaiXiu/TaiXiuGame');
const BotAI = require('./BotAI');

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
      spectators: [], // Danh sách khán giả
      // Tất cả game: min 2 (tính cả bot), max tùy game
      // Tiến lên: min 2, max 4
      // Sâm lốc: min 2, max 4
      // Cờ vây: min 2, max 2
      // Cờ vua: min 2, max 2
      // XO: min 2, max 2
      // Tài Xỉu: min 2, max 10
      minPlayers: 2, // Tất cả game cần ít nhất 2 người (tính cả bot)
      maxPlayers: (gameType === 'tienlen' || gameType === 'samloc') ? 4 : 
                  (gameType === 'taixiu' ? 10 : 2),
      gameState: null,
      messages: [], // Lịch sử chat
      botDifficulty: 'medium', // Độ khó bot: 'easy', 'medium', 'hard'
      createdAt: new Date()
    };

    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  getRooms() {
    // Hiển thị các phòng đang chờ (waiting) và đang chơi (playing) trong lobby
    // Không hiển thị phòng đã finished
    return Array.from(this.rooms.values()).filter(room => room.status === 'waiting' || room.status === 'playing');
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
    // Cũng xóa khỏi spectators nếu có
    if (room.spectators) {
      room.spectators = room.spectators.filter(s => s.id !== userId);
    }
    
    // Kiểm tra số lượng người chơi thật (không phải bot)
    const realPlayers = room.players.filter(p => !p.isBot && !p.id.startsWith('bot_'));
    const spectatorCount = room.spectators ? room.spectators.length : 0;
    
    // Nếu không còn người chơi thật nào và không còn spectator, xóa room
    if (realPlayers.length === 0 && spectatorCount === 0) {
      console.log(`[ROOM] Deleting room ${roomId} - no real players left`);
      this.rooms.delete(roomId);
      return;
    }
    
    // Nếu host rời phòng và còn người chơi thật, chuyển host
    if (room.hostId === userId && realPlayers.length > 0) {
      // Chuyển host cho người chơi thật đầu tiên (không phải bot)
      room.hostId = realPlayers[0].id;
      console.log(`[ROOM] Host changed to ${realPlayers[0].id} in room ${roomId}`);
    }
  }

  addBotToRoom(roomId, difficulty = 'medium') {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Không tìm thấy phòng' };

    // Kiểm tra xem đã có bao nhiêu bot
    const botCount = room.players.filter(p => p.isBot).length;
    const realPlayerCount = room.players.filter(p => !p.isBot).length;
    const totalPlayers = room.players.length;

      // Cờ vua chỉ được phép có tối đa 1 bot
      if (room.gameType === 'covua' && botCount >= 1) {
        return { success: false, error: 'Cờ vua chỉ được thêm tối đa 1 bot' };
      }

    // Kiểm tra xem còn chỗ cho bot không
    if (totalPlayers >= room.maxPlayers) {
      return { success: false, error: 'Phòng đã đầy' };
    }

    // Không cho thêm bot khi game đang chơi
    if (room.status === 'playing') {
      return { success: false, error: 'Không thể thêm bot khi game đang chơi' };
    }

    // Tạo bot mới
    const botId = 'bot_' + Date.now() + '_' + botCount;
    const difficultyName = difficulty === 'easy' ? 'Dễ' : difficulty === 'hard' ? 'Khó' : 'Trung bình';
    const botName = `Bot ${botCount + 1} (${difficultyName})`;
    const bot = {
      id: botId,
      username: botName,
      isBot: true,
      difficulty: difficulty
    };

    room.players.push(bot);

    return { success: true, data: { bot } };
  }

  removeBotFromRoom(roomId, botId) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Không tìm thấy phòng' };

    // Không cho xóa bot khi game đang chơi
    if (room.status === 'playing') {
      return { success: false, error: 'Không thể xóa bot khi game đang chơi' };
    }

    const botIndex = room.players.findIndex(p => p.id === botId && p.isBot);
    if (botIndex === -1) {
      return { success: false, error: 'Không tìm thấy bot' };
    }

    room.players.splice(botIndex, 1);

    return { success: true };
  }

  addSpectatorToRoom(roomId, spectator) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    if (!room.spectators) {
      room.spectators = [];
    }

    // Kiểm tra xem đã có trong players hoặc spectators chưa
    const isPlayer = room.players.some(p => p.id === spectator.id);
    const existingSpectatorIndex = room.spectators.findIndex(s => s.id === spectator.id);
    
    if (isPlayer) {
      return false; // Đã là player, không thể làm spectator
    }

    if (existingSpectatorIndex === -1) {
      room.spectators.push(spectator);
    } else {
      // Cập nhật socketId nếu đã có
      room.spectators[existingSpectatorIndex].socketId = spectator.socketId;
      room.spectators[existingSpectatorIndex].username = spectator.username;
    }
    return true;
  }

  startGame(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Cho phép start lại từ trạng thái finished hoặc waiting
    if (room.status !== 'waiting' && room.status !== 'finished') return false;
    // Kiểm tra số người chơi (bao gồm cả bot)
    if (room.players.length < room.minPlayers) return false;

    // Lưu thông tin lượt trước trước khi reset (cho Tiến lên và Sâm lốc)
    let lastWinner = null;
    let lastPlayerCount = null;
    if (room.gameType === 'tienlen' || room.gameType === 'samloc') {
      lastWinner = room.lastWinner;
      lastPlayerCount = room.lastPlayerCount;
    }
    
    // Reset game state trước khi bắt đầu ván mới
    room.gameState = null;
    room.winner = null;
    room.status = 'playing';
    
    // Lấy players từ room (bao gồm cả bot nếu đã được thêm)
    const playersToUse = [...room.players];
    
    // Initialize game based on type
    if (room.gameType === 'tienlen') {
      // Đảm bảo players có đầy đủ thông tin bot
      const playersWithBotInfo = playersToUse.map(p => ({
        ...p,
        isBot: p.isBot || false,
        difficulty: p.difficulty || 'medium'
      }));
      
      // Xác định người đánh đầu tiên
      let startPlayerId = null;
      if (lastWinner && lastPlayerCount === playersToUse.length) {
        // Nếu có người thắng lượt trước và số người giống nhau
        const winnerStillInGame = playersWithBotInfo.find(p => p.id === lastWinner);
        if (winnerStillInGame) {
          startPlayerId = lastWinner;
        }
      }
      
      room.gameState = new TienLenGame(playersWithBotInfo, startPlayerId);
      
      // Lưu bot info vào room để dùng khi bot chơi
      room.bots = playersWithBotInfo.filter(p => p.isBot).map(bot => ({
        id: bot.id,
        difficulty: bot.difficulty || 'medium'
      }));
      
      console.log('TienLen game started with bots:', room.bots);
      console.log('GameState players:', room.gameState.players.map(p => ({ id: p.id, username: p.username, isBot: p.isBot })));
    } else if (room.gameType === 'samloc') {
      // Đảm bảo players có đầy đủ thông tin bot
      const playersWithBotInfo = playersToUse.map(p => ({
        ...p,
        isBot: p.isBot || false,
        difficulty: p.difficulty || 'medium'
      }));
      
      // Xác định người đánh đầu tiên
      let startPlayerId = null;
      if (lastWinner && lastPlayerCount === playersToUse.length) {
        // Nếu có người thắng lượt trước và số người giống nhau
        const winnerStillInGame = playersWithBotInfo.find(p => p.id === lastWinner);
        if (winnerStillInGame) {
          startPlayerId = lastWinner;
        }
      }
      
      room.gameState = new SamLocGame(playersWithBotInfo, startPlayerId);
      
      // Lưu bot info vào room để dùng khi bot chơi
      room.bots = playersWithBotInfo.filter(p => p.isBot).map(bot => ({
        id: bot.id,
        difficulty: bot.difficulty || 'medium'
      }));
      
      console.log('SamLoc game started with bots:', room.bots);
      console.log('GameState players:', room.gameState.players.map(p => ({ id: p.id, username: p.username, isBot: p.isBot })));
    } else if (room.gameType === 'covay') {
      room.gameState = new CoVayGame(playersToUse);
    } else if (room.gameType === 'covua') {
      // Đảm bảo players có đầy đủ thông tin bot
      const playersWithBotInfo = playersToUse.map(p => ({
        ...p,
        isBot: p.isBot || false,
        difficulty: p.difficulty || 'medium'
      }));
      
      room.gameState = new CoVuaGame(playersWithBotInfo);
      
      // Lưu bot info vào room để dùng khi bot chơi
      room.bots = playersWithBotInfo.filter(p => p.isBot).map(bot => ({
        id: bot.id,
        difficulty: bot.difficulty || 'medium'
      }));
      
      console.log('CoVua game started with bots:', room.bots);
    } else if (room.gameType === 'xo') {
      room.gameState = new XOGame(playersToUse);
      // Lưu bot info vào gameState nếu có bot
      const botPlayer = playersToUse.find(p => p.isBot);
      if (botPlayer) {
        room.gameState.botAI = new BotAI(botPlayer.difficulty || 'medium');
        room.gameState.botPlayerId = botPlayer.id;
      }
    } else if (room.gameType === 'taixiu') {
      room.gameState = new TaiXiuGame(playersToUse, room.hostId);
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
      
      // Lưu thông tin lượt trước cho Tiến lên và Sâm lốc
      if (room.gameType === 'tienlen' || room.gameType === 'samloc') {
        room.lastWinner = result.data.winner;
        room.lastPlayerCount = room.players.length;
      }
    }

    return result;
  }

  handleBotMove(roomId, botId) {
    const room = this.rooms.get(roomId);
    if (!room || !room.gameState || room.status !== 'playing') {
      return { success: false, error: 'Game không tồn tại hoặc đã kết thúc' };
    }

    // XO Game bot
    if (room.gameType === 'xo' && room.gameState.botAI) {
      const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
      if (!currentPlayer || currentPlayer.id !== botId || !currentPlayer.isBot) {
        return { success: false, error: 'Không phải lượt của bot' };
      }

      const playerIndex = room.gameState.players.findIndex(p => p.id === botId);
      const botSymbol = playerIndex === 0 ? 'X' : 'O';
      const opponentSymbol = playerIndex === 0 ? 'O' : 'X';

      // Bot chọn nước đi
      const botMove = room.gameState.botAI.getXOMove(
        JSON.parse(JSON.stringify(room.gameState.board)), // Clone board
        botSymbol,
        opponentSymbol
      );

      if (botMove) {
        // Bot thực hiện nước đi
        const result = room.gameState.handleAction(botId, 'make-move', {
          row: botMove.row,
          col: botMove.col
        });

        // Check if game is over
        if (result.success && result.data && result.data.gameOver) {
          room.status = 'finished';
          room.winner = result.data.winner;
        }

        return result;
      }
    }

    // Tien Len Game bot
    if (room.gameType === 'tienlen' && room.gameState) {
      const currentPlayerId = room.gameState.currentPlayerId || 
                              (room.gameState.players && room.gameState.players[room.gameState.currentPlayerIndex]?.id);
      
      if (!currentPlayerId || currentPlayerId !== botId) {
        return { success: false, error: 'Không phải lượt của bot' };
      }
      
      const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
      if (!currentPlayer) {
        return { success: false, error: 'Không tìm thấy người chơi hiện tại' };
      }

      // Tìm bot - ưu tiên tìm trong gameState.players, sau đó room.players
      let bot = room.gameState.players.find(p => p.id === botId && p.isBot);
      if (!bot) {
        bot = room.players.find(p => p.id === botId && p.isBot);
      }
      // Nếu vẫn không tìm thấy, thử tìm trong room.bots
      if (!bot && room.bots) {
        const botInfo = room.bots.find(b => b.id === botId);
        if (botInfo) {
          // Tìm player với botId này và thêm isBot flag
          bot = room.gameState.players.find(p => p.id === botId) || room.players.find(p => p.id === botId);
          if (bot) {
            bot.isBot = true;
            bot.difficulty = botInfo.difficulty;
          }
        }
      }
      
      if (!bot) {
        console.log('Bot not found:', botId);
        console.log('Room players:', room.players.map(p => ({ id: p.id, isBot: p.isBot, username: p.username })));
        console.log('GameState players:', room.gameState.players?.map(p => ({ id: p.id, isBot: p.isBot, username: p.username })));
        console.log('Room bots:', room.bots);
        return { success: false, error: 'Không tìm thấy bot' };
      }

      const botHand = room.gameState.hands[botId];
      if (!botHand || botHand.length === 0) {
        console.log('Bot has no cards:', botId, 'Hands:', Object.keys(room.gameState.hands));
        return { success: false, error: 'Bot không có bài' };
      }

      // Tạo botAI instance với độ khó của bot
      const botDifficulty = bot.difficulty || (room.bots && room.bots.find(b => b.id === botId)?.difficulty) || 'medium';
      const botAI = new BotAI(botDifficulty);
      
      // Kiểm tra xem bot có thể bỏ lượt không
      const canPass = room.gameState.canPass ? room.gameState.canPass(botId) : true;
      
      // Bot chọn nước đi
      const botMove = botAI.getTienLenMove(
        botHand,
        room.gameState.lastPlay,
        canPass,
        room.gameState
      );

      if (botMove.action === 'play-cards') {
        // Bot thực hiện đánh bài
        const result = room.gameState.handleAction(botId, 'play-cards', {
          cards: botMove.cardIndices
        });

        // Check if game is over
        if (result.success && result.data && result.data.gameOver) {
          room.status = 'finished';
          room.winner = result.data.winner;
        }

        return result;
      } else if (botMove.action === 'pass' && canPass) {
        // Bot bỏ lượt
        const result = room.gameState.handleAction(botId, 'pass', {});
        return result;
      } else {
        // Không thể chơi hoặc pass, thử đánh bài thấp nhất
        console.log('[BOT] Cannot play or pass, trying to play lowest card');
        if (botHand && botHand.length > 0) {
          const result = room.gameState.handleAction(botId, 'play-cards', {
            cards: [botHand.length - 1] // Đánh bài cuối cùng (thấp nhất)
          });
          if (result.success) {
            if (result.data && result.data.gameOver) {
              room.status = 'finished';
              room.winner = result.data.winner;
            }
            return result;
          }
        }
      }
    }

    // Sam Loc Game bot (tương tự Tien Len)
    if (room.gameType === 'samloc' && room.gameState) {
      const currentPlayerId = room.gameState.currentPlayerId || 
                              (room.gameState.players && room.gameState.players[room.gameState.currentPlayerIndex]?.id);
      
      if (!currentPlayerId || currentPlayerId !== botId) {
        return { success: false, error: 'Không phải lượt của bot' };
      }
      
      const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
      if (!currentPlayer) {
        return { success: false, error: 'Không tìm thấy người chơi hiện tại' };
      }

      // Tìm bot - ưu tiên tìm trong gameState.players, sau đó room.players
      let bot = room.gameState.players.find(p => p.id === botId && p.isBot);
      if (!bot) {
        bot = room.players.find(p => p.id === botId && p.isBot);
      }
      // Nếu vẫn không tìm thấy, thử tìm trong room.bots
      if (!bot && room.bots) {
        const botInfo = room.bots.find(b => b.id === botId);
        if (botInfo) {
          // Tìm player với botId này và thêm isBot flag
          bot = room.gameState.players.find(p => p.id === botId) || room.players.find(p => p.id === botId);
          if (bot) {
            bot.isBot = true;
            bot.difficulty = botInfo.difficulty;
          }
        }
      }
      
      if (!bot) {
        console.log('Bot not found:', botId);
        console.log('Room players:', room.players.map(p => ({ id: p.id, isBot: p.isBot, username: p.username })));
        console.log('GameState players:', room.gameState.players?.map(p => ({ id: p.id, isBot: p.isBot, username: p.username })));
        console.log('Room bots:', room.bots);
        return { success: false, error: 'Không tìm thấy bot' };
      }

      const botHand = room.gameState.hands[botId];
      if (!botHand || botHand.length === 0) {
        console.log('Bot has no cards:', botId, 'Hands:', Object.keys(room.gameState.hands));
        return { success: false, error: 'Bot không có bài' };
      }

      // Tạo botAI instance với độ khó của bot
      const botDifficulty = bot.difficulty || (room.bots && room.bots.find(b => b.id === botId)?.difficulty) || 'medium';
      const botAI = new BotAI(botDifficulty);
      
      // Kiểm tra xem bot có thể bỏ lượt không
      const canPass = room.gameState.canPass ? room.gameState.canPass(botId) : true;
      
      // Bot chọn nước đi
      const botMove = botAI.getSamLocMove(
        botHand,
        room.gameState.lastPlay,
        canPass,
        room.gameState
      );

      if (botMove.action === 'play-cards') {
        // Bot thực hiện đánh bài
        const result = room.gameState.handleAction(botId, 'play-cards', {
          cards: botMove.cardIndices
        });

        // Check if game is over
        if (result.success && result.data && result.data.gameOver) {
          room.status = 'finished';
          room.winner = result.data.winner;
        }

        return result;
      } else if (botMove.action === 'pass' && canPass) {
        // Bot bỏ lượt
        const result = room.gameState.handleAction(botId, 'pass', {});
        return result;
      } else {
        // Không thể chơi hoặc pass, thử đánh bài thấp nhất
        console.log('[BOT] Cannot play or pass, trying to play lowest card');
        if (botHand && botHand.length > 0) {
          const result = room.gameState.handleAction(botId, 'play-cards', {
            cards: [botHand.length - 1] // Đánh bài cuối cùng (thấp nhất)
          });
          if (result.success) {
            if (result.data && result.data.gameOver) {
              room.status = 'finished';
              room.winner = result.data.winner;
            }
            return result;
          }
        }
      }
    }

    // Co Vua Game bot
    if (room.gameType === 'covua' && room.gameState) {
      const currentPlayerId = room.gameState.currentPlayerId || 
                              (room.gameState.players && room.gameState.players[room.gameState.currentPlayerIndex]?.id);
      
      if (!currentPlayerId || currentPlayerId !== botId) {
        return { success: false, error: 'Không phải lượt của bot' };
      }

      // Tìm bot
      let bot = room.gameState.players.find(p => p.id === botId && p.isBot);
      if (!bot && room.bots) {
        const botInfo = room.bots.find(b => b.id === botId);
        if (botInfo) {
          bot = room.gameState.players.find(p => p.id === botId);
          if (bot) {
            bot.isBot = true;
            bot.difficulty = botInfo.difficulty;
          }
        }
      }
      
      if (!bot) {
        return { success: false, error: 'Không tìm thấy bot' };
      }

      // Lấy gameState cho bot để có validMoves
      const botGameState = room.gameState.getStateForPlayer(botId);
      if (!botGameState || !botGameState.validMoves || botGameState.validMoves.length === 0) {
        return { success: false, error: 'Bot không có nước đi hợp lệ' };
      }

      // Tạo botAI instance với độ khó của bot
      const botDifficulty = bot.difficulty || (room.bots && room.bots.find(b => b.id === botId)?.difficulty) || 'medium';
      const botAI = new BotAI(botDifficulty);
      
      // Bot chọn nước đi
      const botMove = botAI.getCoVuaMove(botGameState);
      
      if (botMove) {
        const result = room.gameState.handleAction(botId, 'move', botMove);
        
        // Check if game is over
        if (result.success && room.gameState.status === 'finished' || room.gameState.status === 'checkmate') {
          room.status = 'finished';
          room.winner = room.gameState.winner;
        }
        
        return result;
      }
    }

    console.log('[BOT] Failed to make move, returning error');
    return { success: false, error: 'Bot không thể chơi' };
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
      players: room.gameState && room.gameState.players ? room.gameState.players : room.players,
      spectators: room.spectators || [],
      minPlayers: room.minPlayers,
      maxPlayers: room.maxPlayers,
      messages: (room.messages || []).map(msg => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
      })),
      createdAt: room.createdAt
    };

    // Thêm winner nếu game đã kết thúc
    if (room.status === 'finished' && room.winner) {
      serialized.winner = room.winner;
    }

    // Serialize game state for the specific player or spectator
    if (room.gameState && (room.status === 'playing' || room.status === 'finished')) {
      serialized.gameState = room.gameState.getStateForPlayer(playerId);
      // Thêm hostId vào gameState để client biết ai là chủ phòng
      if (room.gameType === 'taixiu') {
        serialized.gameState.hostId = room.hostId;
      }
    }

    return serialized;
  }
}

module.exports = GameManager;

