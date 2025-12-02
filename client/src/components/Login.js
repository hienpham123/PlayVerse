import React, { useState } from 'react';
import '../App.css';
import { login } from '../services/api';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Vui lòng nhập tên người chơi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await login(username.trim());
      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="container" style={{ maxWidth: '400px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#667eea' }}>
          🎮 Game Online
        </h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="input"
            placeholder="Nhập tên người chơi"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            autoFocus
          />
          {error && (
            <div style={{ color: '#dc3545', marginBottom: '10px' }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập...' : 'Bắt đầu chơi'}
          </button>
        </form>
        <div style={{ marginTop: '20px', textAlign: 'center', color: '#666' }}>
          <p>Chơi Tiến lên, Phỏm cùng bạn bè</p>
        </div>
      </div>
    </div>
  );
}

export default Login;

