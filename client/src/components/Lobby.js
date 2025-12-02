import React, { useState, useEffect } from 'react';
import '../App.css';
import { socket } from '../services/socket';
import { getRooms } from '../services/api';

function Lobby({ user, onLogout, onJoinRoom }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gameType, setGameType] = useState('tienlen');

  useEffect(() => {
    loadRooms();

    socket.on('room-created', ({ room }) => {
      setRooms(prev => {
        // Kiểm tra xem phòng đã tồn tại chưa
        const exists = prev.find(r => r.id === room.id);
        if (exists) {
          // Cập nhật room nếu đã tồn tại (ví dụ khi status thay đổi)
          return prev.map(r => r.id === room.id ? room : r);
        }
        return [...prev, room];
      });
    });

    socket.on('rooms-updated', ({ rooms: updatedRooms }) => {
      setRooms(updatedRooms);
    });

    return () => {
      socket.off('room-created');
      socket.off('rooms-updated');
    };
  }, []);

  const loadRooms = async () => {
    try {
      const data = await getRooms();
      setRooms(data.rooms || []);
    } catch (err) {
      console.error('Error loading rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = () => {
    socket.emit('create-room', {
      gameType,
      userId: user.id,
      username: user.username
    });
  };

  const handleJoinRoom = (room) => {
    socket.emit('join-room', {
      roomId: room.id,
      userId: user.id,
      username: user.username
    });

    socket.once('joined-room', ({ room: joinedRoom }) => {
      onJoinRoom(joinedRoom);
    });

    socket.once('error', ({ message }) => {
      alert(message);
    });
  };

  const getGameTypeName = (type) => {
    const names = {
      'tienlen': 'Tiến lên',
      'samloc': 'Sâm lốc',
      'covay': 'Cờ vây',
      'covua': 'Cờ vua',
      'cotuong': 'Cờ tướng',
      'xo': 'Cờ XO',
      'taixiu': 'Tài Xỉu'
    };
    return names[type] || type;
  };

  return (
    <div className="App">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ color: '#667eea' }}>🎮 Lobby</h1>
          <div>
            <span style={{ marginRight: '10px' }}>Xin chào, <strong>{user.username}</strong></span>
            <button className="btn btn-secondary" onClick={onLogout}>
              Đăng xuất
            </button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '20px' }}>
          <h2>Tạo phòng mới</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>Chọn loại game bạn muốn chơi:</p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
            gap: '15px', 
            marginBottom: '25px' 
          }}>
            {[
              { value: 'tienlen', name: 'Tiến lên', icon: '🂮' },
              { value: 'samloc', name: 'Sâm lốc', icon: '🎴' },
              { value: 'covay', name: 'Cờ vây', icon: '⚫' },
              { value: 'covua', name: 'Cờ vua', icon: '♔' },
              { value: 'cotuong', name: 'Cờ tướng', icon: '將' },
              { value: 'xo', name: 'Cờ XO', icon: '⭕' },
              { value: 'taixiu', name: 'Tài Xỉu', icon: '🎲' }
            ].map(game => (
              <button
                key={game.value}
                onClick={() => setGameType(game.value)}
                style={{
                  padding: '20px 15px',
                  border: `3px solid ${gameType === game.value ? '#667eea' : '#e0e0e0'}`,
                  borderRadius: '12px',
                  background: gameType === game.value 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : 'white',
                  color: gameType === game.value ? 'white' : '#333',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: gameType === game.value 
                    ? '0 4px 15px rgba(102, 126, 234, 0.4)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  if (gameType !== game.value) {
                    e.target.style.transform = 'translateY(-3px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (gameType !== game.value) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  }
                }}
              >
                <span style={{ fontSize: '32px' }}>{game.icon}</span>
                <span>{game.name}</span>
              </button>
            ))}
          </div>

          <button 
            className="btn btn-success" 
            onClick={handleCreateRoom}
            style={{ 
              width: '100%', 
              padding: '15px',
              fontSize: '18px',
              fontWeight: '600'
            }}
          >
            🎮 Tạo phòng {getGameTypeName(gameType)}
          </button>
        </div>

        <div>
          {(() => {
            const waitingRooms = rooms.filter(r => r.status === 'waiting');
            const playingRooms = rooms.filter(r => r.status === 'playing');
            
            return (
              <>
                {waitingRooms.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h2>Phòng đang chờ ({waitingRooms.length})</h2>
                    {loading ? (
                      <p>Đang tải...</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px', marginTop: '20px' }}>
                        {waitingRooms.map(room => (
                          <div key={room.id} className="card">
                            <h3>{getGameTypeName(room.gameType)}</h3>
                            <p>Người chơi: {room.players.length}/{room.maxPlayers}</p>
                            <p style={{ fontSize: '14px', color: '#666' }}>
                              Chủ phòng: {room.players[0]?.username}
                            </p>
                            <button
                              className="btn btn-primary"
                              style={{ width: '100%', marginTop: '10px' }}
                              onClick={() => handleJoinRoom(room)}
                              disabled={room.players.length >= room.maxPlayers && !['xo', 'covua', 'cotuong', 'covay', 'taixiu'].includes(room.gameType)}
                            >
                              {room.players.length >= room.maxPlayers && ['xo', 'covua', 'cotuong', 'covay', 'taixiu'].includes(room.gameType) 
                                ? 'Xem trận đấu' 
                                : room.players.length >= room.maxPlayers 
                                  ? 'Phòng đầy' 
                                  : 'Vào phòng'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {playingRooms.length > 0 && (
                  <div>
                    <h2>Trận đấu đang diễn ra ({playingRooms.length})</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px', marginTop: '20px' }}>
                      {playingRooms.map(room => {
                        const canSpectate = ['xo', 'covua', 'cotuong', 'covay', 'taixiu'].includes(room.gameType);
                        const isPlayerInRoom = room.players.some(p => p.id === user.id);
                        const isSpectatorInRoom = room.spectators?.some(s => s.id === user.id);
                        const canJoin = canSpectate && !isPlayerInRoom && !isSpectatorInRoom;
                        
                        return (
                          <div key={room.id} className="card" style={{ border: '2px solid #667eea' }}>
                            <h3>{getGameTypeName(room.gameType)}</h3>
                            <p style={{ 
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: 'white',
                              padding: '8px',
                              borderRadius: '6px',
                              marginBottom: '10px',
                              textAlign: 'center',
                              fontWeight: 'bold'
                            }}>
                              🔴 Trận đấu đang diễn ra
                            </p>
                            <p>Người chơi: {room.players.map(p => p.username).join(' vs ')}</p>
                            {room.spectators && room.spectators.length > 0 && (
                              <p style={{ fontSize: '14px', color: '#666' }}>
                                👁️ Khán giả: {room.spectators.length}
                              </p>
                            )}
                            {canJoin && (
                              <button
                                className="btn btn-primary"
                                style={{ width: '100%', marginTop: '10px' }}
                                onClick={() => handleJoinRoom(room)}
                              >
                                👁️ Xem trận đấu
                              </button>
                            )}
                            {(isPlayerInRoom || isSpectatorInRoom) && (
                              <button
                                className="btn btn-primary"
                                style={{ width: '100%', marginTop: '10px' }}
                                onClick={() => handleJoinRoom(room)}
                              >
                                {isPlayerInRoom ? 'Vào phòng' : 'Vào xem'}
                              </button>
                            )}
                            {!canJoin && !isPlayerInRoom && !isSpectatorInRoom && (
                              <p style={{ color: '#999', textAlign: 'center', marginTop: '10px' }}>
                                Không thể tham gia
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {waitingRooms.length === 0 && playingRooms.length === 0 && !loading && (
                  <p style={{ color: '#666', marginTop: '20px' }}>Chưa có phòng nào. Hãy tạo phòng mới!</p>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export default Lobby;

