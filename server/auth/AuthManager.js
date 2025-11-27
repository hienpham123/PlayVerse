class AuthManager {
  constructor() {
    this.users = new Map(); // userId -> user info
  }

  login(username) {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user = {
      id: userId,
      username,
      createdAt: new Date()
    };
    
    this.users.set(userId, user);
    return user;
  }

  getUser(userId) {
    return this.users.get(userId);
  }

  logout(userId) {
    this.users.delete(userId);
  }
}

module.exports = AuthManager;

