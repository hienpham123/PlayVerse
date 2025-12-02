import React, { useState, useEffect, useRef } from 'react';
import '../App.css';
import { socket } from '../services/socket';
import TienLenGame from './games/TienLenGame';
import SamLocGame from './games/SamLocGame';
import CoVayGame from './games/CoVayGame';
import CoVuaGame from './games/CoVuaGame';
import CoTuongGame from './games/CoTuongGame';
import XOGame from './games/XOGame';
import './GameRoom.css';

function GameRoom({ user, room: initialRoom, onLeaveRoom }) {
  const [room, setRoom] = useState(initialRoom);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState(initialRoom?.messages ? [...initialRoom.messages] : []);
  const [chatMessage, setChatMessage] = useState('');
  const [isSpectator, setIsSpectator] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Kiểm tra xem người chơi đã có trong phòng chưa
    const isPlayerInRoom = room && room.players && room.players.some(p => p.id === user.id);
    
    // Chỉ join nếu chưa có trong phòng
    const joinRoomIfNeeded = () => {
      if (room && room.id && socket.connected && !isPlayerInRoom) {
        socket.emit('join-room', {
          roomId: room.id,
          userId: user.id,
          username: user.username
        });
      }
    };

    // Nếu socket đã connected, join ngay
    if (socket.connected) {
      joinRoomIfNeeded();
    } else {
      // Nếu chưa connected, đợi connect xong rồi join
      socket.on('connect', joinRoomIfNeeded);
    }

    socket.on('room-updated', ({ room: updatedRoom }) => {
      setRoom(updatedRoom);
      // Lưu room mới vào localStorage
      localStorage.setItem('currentRoom', JSON.stringify(updatedRoom));
    });

    socket.on('game-started', ({ room: updatedRoom }) => {
      setRoom(updatedRoom);
      if (updatedRoom.gameState) {
        setGameState(updatedRoom.gameState);
      }
      // Lưu room mới vào localStorage
      localStorage.setItem('currentRoom', JSON.stringify(updatedRoom));
    });

    socket.on('game-update', ({ room: updatedRoom, action, data }) => {
      setRoom(updatedRoom);
      if (updatedRoom.gameState) {
        setGameState(updatedRoom.gameState);
      } else {
        // Clear gameState nếu không có (ví dụ khi game finished)
        setGameState(null);
      }
      setError('');
      // Lưu room mới vào localStorage
      localStorage.setItem('currentRoom', JSON.stringify(updatedRoom));
    });

    socket.on('joined-room', ({ room: joinedRoom, isSpectator: spectatorFlag }) => {
      setRoom(joinedRoom);
      if (joinedRoom.gameState) {
        setGameState(joinedRoom.gameState);
      }
      // Cập nhật trạng thái spectator
      if (spectatorFlag) {
        setIsSpectator(true);
        setError(''); // Xóa error khi join thành công với tư cách spectator
      } else {
        setIsSpectator(false);
      }
      // Lưu room mới vào localStorage
      localStorage.setItem('currentRoom', JSON.stringify(joinedRoom));
    });

    socket.on('error', ({ message }) => {
      // Nếu là spectator và lỗi là về việc không thể thêm người chơi, bỏ qua lỗi này
      if (message.includes('Không thể thêm người chơi vào phòng') || message.includes('không thể thêm người chơi vào phòng')) {
        // Kiểm tra xem user có phải là spectator không
        const isUserSpectator = room?.spectators?.some(s => s.id === user.id) || 
                                room?.status === 'playing' && !room?.players?.some(p => p.id === user.id);
        if (isUserSpectator) {
          // Không hiển thị lỗi này cho spectator
          return;
        }
      }
      
      setError(message);
      // Nếu lỗi là room không tồn tại, xóa khỏi localStorage
      if (message.includes('không tìm thấy') || message.includes('Không tìm thấy')) {
        localStorage.removeItem('currentRoom');
        onLeaveRoom();
      }
    });

    socket.on('chat-message', (message) => {
      setMessages(prev => {
        // Kiểm tra xem message đã tồn tại chưa để tránh duplicate
        const exists = prev.some(m => m.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });
    });

    return () => {
      socket.off('connect', joinRoomIfNeeded);
      socket.off('room-updated');
      socket.off('game-started');
      socket.off('game-update');
      socket.off('joined-room');
      socket.off('error');
      socket.off('chat-message');
    };
  }, [user.id, room?.id]);

  useEffect(() => {
    if (room?.gameState) {
      setGameState(room.gameState);
    }
  }, [room?.gameState]);

  useEffect(() => {
    // Cập nhật messages từ room khi room thay đổi
    if (room?.messages && Array.isArray(room.messages)) {
      setMessages(prev => {
        // Tạo map để loại bỏ duplicate
        const messageMap = new Map();
        
        // Thêm messages cũ vào map
        prev.forEach(msg => {
          if (msg.id) {
            messageMap.set(msg.id, msg);
          }
        });
        
        // Thêm messages mới vào map (sẽ override nếu trùng id)
        room.messages.forEach(msg => {
          if (msg.id) {
            messageMap.set(msg.id, msg);
          }
        });
        
        // Convert map về array và sort theo timestamp
        const sortedMessages = Array.from(messageMap.values()).sort((a, b) => {
          const timeA = new Date(a.timestamp || 0).getTime();
          const timeB = new Date(b.timestamp || 0).getTime();
          return timeA - timeB;
        });
        
        return sortedMessages;
      });
    }
    
    // Cập nhật trạng thái spectator dựa trên room
    if (room) {
      const userIsSpectator = room.spectators?.some(s => s.id === user.id);
      setIsSpectator(userIsSpectator || false);
    }
  }, [room, user.id]);

  useEffect(() => {
    // Scroll to bottom when new message arrives
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    socket.emit('chat-message', {
      roomId: room.id,
      userId: user.id,
      username: user.username,
      message: chatMessage.trim()
    });

    setChatMessage('');
  };

  const isPlayer = room?.players?.some(p => p.id === user.id);
  const spectatorCount = room?.spectators?.length || 0;

  const handleLeave = () => {
    socket.emit('leave-room', {
      roomId: room.id,
      userId: user.id
    });
    // Xóa room khỏi localStorage
    localStorage.removeItem('currentRoom');
    onLeaveRoom();
  };

  const handleStartGame = () => {
    if (room.hostId !== user.id) {
      setError('Chỉ chủ phòng mới có thể bắt đầu game');
      return;
    }
    socket.emit('start-game', {
      roomId: room.id,
      userId: user.id
    });
  };

  const getGameTypeName = (type) => {
    const names = {
      'tienlen': 'Tiến lên',
      'samloc': 'Sâm lốc',
      'covay': 'Cờ vây',
      'covua': 'Cờ vua',
      'xo': 'Cờ XO'
    };
    return names[type] || type;
  };

  return (
    <div className="game-room">
      <div className="game-header">
        <div>
          <h1>{getGameTypeName(room.gameType)}</h1>
          <p>Phòng: {room.id.substring(0, 8)}</p>
          {room.status === 'playing' && spectatorCount > 0 && (
            <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
              👁️ {spectatorCount} khán giả đang xem
            </p>
          )}
        </div>
        <button className="btn btn-danger" onClick={handleLeave}>
          Rời phòng
        </button>
      </div>

      {error && (!isSpectator || !error.includes('Không thể thêm người chơi vào phòng')) && (
        <div className="error-message">{error}</div>
      )}

      {room.status === 'waiting' && (
        <div className="waiting-room">
          <h2>Đang chờ người chơi...</h2>
          <div className="players-list">
            {room.players.map(player => (
              <div key={player.id} className="player-item">
                {player.username} {player.id === room.hostId && '(Chủ phòng)'}
              </div>
            ))}
          </div>
          {room.hostId === user.id && (
            <button
              className="btn btn-success"
              onClick={handleStartGame}
              disabled={room.players.length < room.minPlayers}
            >
              Bắt đầu game ({room.players.length}/{room.minPlayers})
            </button>
          )}
        </div>
      )}

      {room.status === 'playing' && gameState && (
        <div className="game-board-with-chat">
          <div className="game-board">
          {/* Chỉ hiển thị players-info cho các game không phải cờ vua (cờ vua tự hiển thị) */}
          {room.gameType !== 'covua' && (
            <div className="players-info">
              {gameState.playerCounts ? (
                gameState.playerCounts.map((player, index) => (
                  <div
                    key={player.id}
                    className={`player-info ${player.id === gameState.currentPlayerId ? 'active' : ''}`}
                  >
                    <div className="player-name">
                      {player.username} {player.id === user.id && '(Bạn)'}
                    </div>
                    <div className="player-cards">
                      {player.id === user.id ? (
                        <span>{player.cardCount} lá</span>
                      ) : (
                        <span>{player.cardCount} lá</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                room.players.map((player, index) => {
                  // Xác định màu của từng người chơi
                  const playerIndex = room.players.findIndex(p => p.id === player.id);
                  const playerColor = playerIndex === 0 ? 'black' : 'white';
                  const colorName = playerColor === 'black' ? 'Đen' : 'Trắng';
                  
                  return (
                    <div
                      key={player.id}
                      className={`player-info ${player.id === gameState.currentPlayerId ? 'active' : ''}`}
                    >
                      <div className="player-name">
                        {player.username} {player.id === user.id && '(Bạn)'} ({colorName})
                      </div>
                      {gameState.capturedStones && (
                        <div className="player-cards">
                          Bắt được: {player.id === user.id ? gameState.capturedStones.mine : gameState.capturedStones.opponent} quân
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {room.gameType === 'tienlen' && gameState && (
            <TienLenGame
              user={user}
              room={room}
              gameState={gameState}
              onAction={(action, data) => {
                socket.emit('game-action', {
                  roomId: room.id,
                  userId: user.id,
                  action,
                  data
                });
              }}
            />
          )}

          {room.gameType === 'samloc' && gameState && (
            <SamLocGame
              user={user}
              room={room}
              gameState={gameState}
              onAction={(action, data) => {
                socket.emit('game-action', {
                  roomId: room.id,
                  userId: user.id,
                  action,
                  data
                });
              }}
            />
          )}

          {room.gameType === 'covay' && gameState && gameState.board && (
            <CoVayGame
              user={user}
              room={room}
              gameState={gameState}
              onAction={(action, data) => {
                socket.emit('game-action', {
                  roomId: room.id,
                  userId: user.id,
                  action,
                  data
                });
              }}
            />
          )}

          {room.gameType === 'covua' && gameState && gameState.board && (
            <CoVuaGame
              user={user}
              room={room}
              gameState={gameState}
              onAction={(action, data) => {
                socket.emit('game-action', {
                  roomId: room.id,
                  userId: user.id,
                  action,
                  data
                });
              }}
            />
          )}

          {room.gameType === 'cotuong' && gameState && (
            <CoTuongGame
              user={user}
              room={room}
              gameState={gameState}
              onAction={(action, data) => {
                socket.emit('game-action', {
                  roomId: room.id,
                  userId: user.id,
                  action,
                  data
                });
              }}
            />
          )}

          {room.gameType === 'xo' && gameState && (
            <XOGame
              user={user}
              room={room}
              gameState={gameState}
              onAction={(action, data) => {
                socket.emit('game-action', {
                  roomId: room.id,
                  userId: user.id,
                  action,
                  data
                });
              }}
            />
          )}
          </div>

          {/* Chat và danh sách khán giả */}
          <div className="chat-sidebar">
            {/* Chat box */}
            <div className="chat-container">
              <div className="chat-header">
                <h3>💬 Chat</h3>
              </div>
              <div className="chat-messages">
                {messages.map((msg) => (
                  <div key={msg.id} className={`chat-message ${msg.userId === user.id ? 'own-message' : ''}`}>
                    <div className="message-header">
                      <span className="message-username">
                        {msg.username}
                        {msg.isPlayer && ' 🎮'}
                        {msg.isSpectator && ' 👁️'}
                      </span>
                      <span className="message-time">
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <div className="message-content">{msg.message}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form className="chat-input-form" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Nhập tin nhắn..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  maxLength={200}
                />
                <button type="submit" className="btn btn-primary chat-send-btn">
                  Gửi
                </button>
              </form>
            </div>

            {/* Danh sách khán giả - chỉ hiển thị cho players */}
            {isPlayer && spectatorCount > 0 && (
              <div className="spectators-list">
                <div className="spectators-header">
                  <h4>👁️ Khán giả ({spectatorCount})</h4>
                </div>
                <div className="spectators-content">
                  {room.spectators?.map(spectator => (
                    <div key={spectator.id} className="spectator-item">
                      {spectator.username}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {room.status === 'finished' && (
        <div className="game-finished">
          <h2>🎉 Game kết thúc!</h2>
          {room.winner && (
            <div>
              <h3>
                {room.winner === user.id 
                  ? '🎊 Bạn đã thắng!' 
                  : `Người thắng: ${room.players.find(p => p.id === room.winner)?.username || 'Unknown'}`}
              </h3>
            </div>
          )}
          <div className="players-list" style={{ marginTop: '20px', marginBottom: '20px' }}>
            <h4>Người chơi trong phòng:</h4>
            {room.players.map(player => (
              <div key={player.id} className="player-item">
                {player.username} {player.id === room.hostId && '(Chủ phòng)'}
              </div>
            ))}
          </div>
          {room.hostId === user.id ? (
            <div>
              <button 
                className="btn btn-success" 
                onClick={handleStartGame}
                style={{ marginRight: '10px' }}
              >
                Chơi lại
              </button>
              <button className="btn btn-secondary" onClick={handleLeave}>
                Rời phòng
              </button>
            </div>
          ) : (
            <div>
              <p style={{ marginBottom: '10px' }}>Đang chờ chủ phòng bắt đầu ván mới...</p>
              <button className="btn btn-secondary" onClick={handleLeave}>
                Rời phòng
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GameRoom;

