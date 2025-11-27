import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:2023/api';

export const login = async (username) => {
  const response = await axios.post(`${API_URL}/auth/login`, { username });
  return response.data;
};

export const getRooms = async () => {
  const response = await axios.get(`${API_URL}/rooms`);
  return response.data;
};

