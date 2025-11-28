class XOGame {
  constructor(players) {
    this.players = players;
    this.currentPlayerIndex = 0; // 0 = X, 1 = O
    this.boardSize = 5; // 5x5 board
    this.board = Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill(null));
    this.moveHistory = [];
    this.status = 'playing'; // playing, finished
    this.winner = null;
    this.winningLine = null; // Array of {row, col} positions for the winning line
    this.winLength = 3; // Cần 3 quân liên tiếp để thắng
  }

  getStateForPlayer(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    const isCurrentPlayer = this.players[this.currentPlayerIndex].id === playerId;
    const mySymbol = playerIndex === 0 ? 'X' : 'O';
    const opponentSymbol = playerIndex === 0 ? 'O' : 'X';
    
    return {
      board: this.board,
      boardSize: this.boardSize,
      currentPlayerId: this.players[this.currentPlayerIndex].id,
      mySymbol,
      opponentSymbol,
      status: this.status,
      winner: this.winner,
      winningLine: this.winningLine,
      isMyTurn: isCurrentPlayer
    };
  }

  handleAction(playerId, action, data) {
    if (this.players[this.currentPlayerIndex].id !== playerId) {
      return { success: false, error: 'Chưa đến lượt bạn' };
    }

    switch (action) {
      case 'make-move':
        return this.makeMove(playerId, data.row, data.col);
      default:
        return { success: false, error: 'Hành động không hợp lệ' };
    }
  }

  makeMove(playerId, row, col) {
    // Validate move
    if (row < 0 || row >= this.boardSize || col < 0 || col >= this.boardSize) {
      return { success: false, error: 'Vị trí không hợp lệ' };
    }

    if (this.board[row][col] !== null) {
      return { success: false, error: 'Ô này đã được đánh' };
    }

    if (this.status !== 'playing') {
      return { success: false, error: 'Game đã kết thúc' };
    }

    // Make the move
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    const symbol = playerIndex === 0 ? 'X' : 'O';
    this.board[row][col] = symbol;
    
    // Save move to history
    this.moveHistory.push({ playerId, row, col, symbol });

    // Check for win or draw
    const result = this.checkGameStatus(row, col, symbol);
    
    if (result.gameOver) {
      this.status = 'finished';
      this.winner = result.winner;
      this.winningLine = result.winningLine;
      
      return { 
        success: true, 
        data: { 
          gameOver: true,
          winner: result.winner,
          winningLine: result.winningLine
        } 
      };
    }

    // Switch to next player
    this.nextTurn();
    return { success: true, data: { row, col, symbol } };
  }

  checkGameStatus(row, col, symbol) {
    // Check for win
    const winningLine = this.checkWin(row, col, symbol);
    
    if (winningLine) {
      return {
        gameOver: true,
        winner: this.players[this.currentPlayerIndex].id,
        winningLine
      };
    }

    // Check for draw (board is full)
    const isDraw = this.board.every(row => row.every(cell => cell !== null));
    
    if (isDraw) {
      return {
        gameOver: true,
        winner: null, // Draw
        winningLine: null
      };
    }

    return { gameOver: false };
  }

  checkWin(row, col, symbol) {
    const directions = [
      { dr: 0, dc: 1 },  // Horizontal
      { dr: 1, dc: 0 },  // Vertical
      { dr: 1, dc: 1 },  // Main diagonal
      { dr: 1, dc: -1 }  // Anti-diagonal
    ];

    for (const dir of directions) {
      const line = this.checkDirection(row, col, symbol, dir.dr, dir.dc);
      if (line && line.length >= this.winLength) {
        return line;
      }
    }

    return null;
  }

  checkDirection(row, col, symbol, dr, dc) {
    const line = [{ row, col }];
    
    // Check forward direction
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && 
           this.board[r][c] === symbol) {
      line.push({ row: r, col: c });
      r += dr;
      c += dc;
    }
    
    // Check backward direction
    r = row - dr;
    c = col - dc;
    while (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && 
           this.board[r][c] === symbol) {
      line.unshift({ row: r, col: c });
      r -= dr;
      c -= dc;
    }
    
    // Return only the winning line (first winLength consecutive pieces)
    if (line.length >= this.winLength) {
      return line.slice(0, this.winLength);
    }
    
    return null;
  }

  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
  }
}

module.exports = XOGame;

