import axios from 'axios';

// Tự động suy ra API_URL từ SOCKET_URL nếu không có REACT_APP_API_URL
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:2023';
const API_URL = process.env.REACT_APP_API_URL || `${SOCKET_URL}/api`;

export const login = async (username) => {
  const response = await axios.post(`${API_URL}/auth/login`, { username });
  return response.data;
};

export const getRooms = async () => {
  const response = await axios.get(`${API_URL}/rooms`);
  return response.data;
};

