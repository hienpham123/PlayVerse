import React, { useState, useEffect } from 'react';
import '../App.css';
import { socket } from '../services/socket';
import TienLenGame from './games/TienLenGame';
import SamLocGame from './games/SamLocGame';
import CoVayGame from './games/CoVayGame';
import CoVuaGame from './games/CoVuaGame';
import XOGame from './games/XOGame';
import './GameRoom.css';

function GameRoom({ user, room: initialRoom, onLeaveRoom }) {
  const [room, setRoom] = useState(initialRoom);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState('');

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

    socket.on('joined-room', ({ room: joinedRoom }) => {
      setRoom(joinedRoom);
      if (joinedRoom.gameState) {
        setGameState(joinedRoom.gameState);
      }
      // Lưu room mới vào localStorage
      localStorage.setItem('currentRoom', JSON.stringify(joinedRoom));
    });

    socket.on('error', ({ message }) => {
      setError(message);
      // Nếu lỗi là room không tồn tại, xóa khỏi localStorage
      if (message.includes('không tìm thấy') || message.includes('Không tìm thấy')) {
        localStorage.removeItem('currentRoom');
        onLeaveRoom();
      }
    });

    return () => {
      socket.off('connect', joinRoomIfNeeded);
      socket.off('room-updated');
      socket.off('game-started');
      socket.off('game-update');
      socket.off('joined-room');
      socket.off('error');
    };
  }, [user.id, room?.id]);

  useEffect(() => {
    if (room?.gameState) {
      setGameState(room.gameState);
    }
  }, [room]);

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
        </div>
        <button className="btn btn-danger" onClick={handleLeave}>
          Rời phòng
        </button>
      </div>

      {error && (
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

