import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import { socket, connectSocket } from './services/socket';

function App() {
  const [user, setUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [view, setView] = useState('login'); // login, lobby, game

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedRoom = localStorage.getItem('currentRoom');
    
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      connectSocket();
      
      // Nếu có phòng đang chơi, tự động join lại
      if (savedRoom) {
        try {
          const roomData = JSON.parse(savedRoom);
          setCurrentRoom(roomData);
          setView('game');
        } catch (err) {
          console.error('Error loading saved room:', err);
          localStorage.removeItem('currentRoom');
          setView('lobby');
        }
      } else {
        setView('lobby');
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    connectSocket();
    setView('lobby');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('currentRoom');
    socket.disconnect();
    setView('login');
    setCurrentRoom(null);
  };

  const handleJoinRoom = (room) => {
    setCurrentRoom(room);
    // Lưu room vào localStorage
    localStorage.setItem('currentRoom', JSON.stringify(room));
    setView('game');
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    // Xóa room khỏi localStorage
    localStorage.removeItem('currentRoom');
    setView('lobby');
  };

  if (view === 'login') {
    return <Login onLogin={handleLogin} />;
  }

  if (view === 'game' && currentRoom) {
    return (
      <GameRoom
        user={user}
        room={currentRoom}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  return (
    <Lobby
      user={user}
      onLogout={handleLogout}
      onJoinRoom={handleJoinRoom}
    />
  );
}

export default App;

