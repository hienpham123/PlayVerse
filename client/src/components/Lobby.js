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
        // Kiểm tra xem phòng đã tồn tại chưa để tránh duplicate
        const exists = prev.find(r => r.id === room.id);
        if (exists) {
          return prev;
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
      'covua': 'Cờ vua'
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px' }}>
            <select
              className="input"
              value={gameType}
              onChange={(e) => setGameType(e.target.value)}
              style={{ width: 'auto', margin: 0 }}
            >
              <option value="tienlen">Tiến lên</option>
              <option value="samloc">Sâm lốc</option>
              <option value="covay">Cờ vây</option>
              <option value="covua">Cờ vua</option>
            </select>
            <button className="btn btn-success" onClick={handleCreateRoom}>
              Tạo phòng
            </button>
          </div>
        </div>

        <div>
          <h2>Phòng đang chờ ({rooms.length})</h2>
          {loading ? (
            <p>Đang tải...</p>
          ) : rooms.length === 0 ? (
            <p style={{ color: '#666', marginTop: '20px' }}>Chưa có phòng nào. Hãy tạo phòng mới!</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px', marginTop: '20px' }}>
              {rooms.map(room => (
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
                    disabled={room.players.length >= room.maxPlayers}
                  >
                    {room.players.length >= room.maxPlayers ? 'Phòng đầy' : 'Vào phòng'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Lobby;

