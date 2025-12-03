import React, { useState, useEffect, useRef } from 'react';
import '../App.css';
import { socket } from '../services/socket';
import TienLenGame from '../games/TienLen/TienLenGame';
import SamLocGame from '../games/SamLoc/SamLocGame';
import CoVayGame from '../games/CoVay/CoVayGame';
import CoVuaGame from '../games/CoVua/CoVuaGame';
import XOGame from '../games/XO/XOGame';
import TaiXiuGame from '../games/TaiXiu/TaiXiuGame';
import './GameRoom.css';

function GameRoom({ user, room: initialRoom, onLeaveRoom }) {
  const [room, setRoom] = useState(initialRoom);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState(initialRoom?.messages ? [...initialRoom.messages] : []);
  const [chatMessage, setChatMessage] = useState('');
  const [isSpectator, setIsSpectator] = useState(false);
  const [showAddBotMenu, setShowAddBotMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const lastMessageCountRef = useRef(0);
  const isUserScrollingRef = useRef(false); // Theo dõi xem user có đang scroll không

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

    socket.on('room-deleted', ({ roomId }) => {
      // Nếu room hiện tại bị xóa, tự động rời phòng
      if (room && room.id === roomId) {
        console.log('Room deleted, leaving...');
        localStorage.removeItem('currentRoom');
        onLeaveRoom();
      }
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
      socket.off('room-deleted');
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

  // Helper function to check if user is near bottom of chat
  const isNearBottom = () => {
    if (!chatMessagesRef.current) return true;
    const container = chatMessagesRef.current;
    const threshold = 150; // pixels from bottom
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom < threshold;
  };

  // Helper function to scroll to bottom
  const scrollToBottom = (force = false) => {
    if (!force && isUserScrollingRef.current) {
      return; // Không scroll nếu user đang scroll
    }
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  };

  // Theo dõi scroll để biết user có đang đọc tin nhắn cũ không
  useEffect(() => {
    const container = chatMessagesRef.current;
    if (!container) return;

    let scrollTimeout;
    const handleScroll = () => {
      // User đang scroll thủ công
      isUserScrollingRef.current = true;
      
      // Clear timeout cũ
      clearTimeout(scrollTimeout);
      
      // Sau 1 giây không scroll, reset flag
      scrollTimeout = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 1000);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  useEffect(() => {
    // Kiểm tra xem có tin nhắn mới không
    const hasNewMessage = messages.length > lastMessageCountRef.current;
    
    if (hasNewMessage) {
      // Lấy tin nhắn mới nhất
      const lastMessage = messages[messages.length - 1];
      const isMyMessage = lastMessage && lastMessage.userId === user.id;
      
      // Chỉ scroll nếu:
      // 1. Đó là tin nhắn của chính user (luôn muốn thấy tin nhắn mình vừa gửi)
      // 2. HOẶC tin nhắn từ người khác VÀ user đang ở gần bottom VÀ không đang scroll
      if (isMyMessage) {
        // Tin nhắn của user, luôn scroll
        scrollToBottom(true);
      } else if (isNearBottom() && !isUserScrollingRef.current) {
        // Tin nhắn từ người khác, chỉ scroll nếu đang ở gần bottom
        scrollToBottom();
      }
    }
    
    // Update last message count
    lastMessageCountRef.current = messages.length;
  }, [messages, user.id]);

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
    // Reset scroll flag để đảm bảo scroll khi tin nhắn đến
    isUserScrollingRef.current = false;
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
      'xo': 'Cờ XO',
      'taixiu': 'Tài Xỉu'
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
              <div key={player.id} className={`player-item ${player.isBot ? 'bot-player' : ''}`}>
                <span>
                  {player.username} 
                  {player.id === room.hostId && ' (Chủ phòng)'}
                  {player.isBot && ' 🤖'}
                </span>
                {player.isBot && room.hostId === user.id && (
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => {
                      socket.emit('remove-bot', { roomId: room.id, botId: player.id });
                    }}
                    style={{ marginLeft: '10px', padding: '2px 8px', fontSize: '12px' }}
                  >
                    Xóa
                  </button>
                )}
              </div>
            ))}
            {room.players.length < room.maxPlayers && room.hostId === user.id && (
              <div className="add-bot-container" style={{ position: 'relative' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAddBotMenu(!showAddBotMenu)}
                  style={{ marginTop: '10px' }}
                >
                  ➕ Thêm Bot
                </button>
                {showAddBotMenu && (
                  <div className="add-bot-menu" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    padding: '15px',
                    marginTop: '5px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                    zIndex: 1000,
                    minWidth: '200px'
                  }}>
                    <h4 style={{ marginTop: 0, marginBottom: '10px' }}>Chọn độ khó bot:</h4>
                    <button
                      className="btn btn-sm"
                      onClick={() => {
                        socket.emit('add-bot', { roomId: room.id, difficulty: 'easy' });
                        setShowAddBotMenu(false);
                      }}
                      style={{ width: '100%', marginBottom: '5px', backgroundColor: '#4CAF50', color: 'white' }}
                    >
                      🤖 Bot Dễ
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => {
                        socket.emit('add-bot', { roomId: room.id, difficulty: 'medium' });
                        setShowAddBotMenu(false);
                      }}
                      style={{ width: '100%', marginBottom: '5px', backgroundColor: '#FF9800', color: 'white' }}
                    >
                      🤖 Bot Trung bình
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => {
                        socket.emit('add-bot', { roomId: room.id, difficulty: 'hard' });
                        setShowAddBotMenu(false);
                      }}
                      style={{ width: '100%', backgroundColor: '#F44336', color: 'white' }}
                    >
                      🤖 Bot Khó
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setShowAddBotMenu(false)}
                      style={{ width: '100%', marginTop: '5px' }}
                    >
                      Hủy
                    </button>
                  </div>
                )}
              </div>
            )}
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

          {room.gameType === 'taixiu' && gameState && (
            <TaiXiuGame
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
              <div className="chat-messages" ref={chatMessagesRef}>
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

