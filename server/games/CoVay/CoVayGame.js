class CoVayGame {
  constructor(players) {
    this.players = players;
    this.currentPlayerIndex = 0;
    this.boardSize = 19;
    this.board = this.createBoard();
    this.moveHistory = [];
    this.capturedStones = { [players[0].id]: 0, [players[1].id]: 0 };
    this.passes = 0;
    this.gamePhase = 'playing'; // playing, finished
  }

  createBoard() {
    // Tạo bàn cờ 19x19, 0 = trống, 1 = đen, 2 = trắng
    const board = [];
    for (let i = 0; i < this.boardSize; i++) {
      board[i] = [];
      for (let j = 0; j < this.boardSize; j++) {
        board[i][j] = 0;
      }
    }
    return board;
  }

  getStateForPlayer(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    const isBlack = playerIndex === 0;
    
    return {
      currentPlayerId: this.players[this.currentPlayerIndex].id,
      board: this.board,
      boardSize: this.boardSize,
      myColor: isBlack ? 'black' : 'white',
      opponentColor: isBlack ? 'white' : 'black',
      capturedStones: {
        mine: this.capturedStones[playerId],
        opponent: this.capturedStones[this.players[1 - playerIndex].id]
      },
      moveHistory: this.moveHistory.slice(-10), // Last 10 moves
      passes: this.passes
    };
  }

  handleAction(playerId, action, data) {
    if (this.players[this.currentPlayerIndex].id !== playerId) {
      return { success: false, error: 'Chưa đến lượt bạn' };
    }

    switch (action) {
      case 'place-stone':
        return this.placeStone(playerId, data.row, data.col);
      case 'pass':
        return this.pass(playerId);
      case 'resign':
        return this.resign(playerId);
      default:
        return { success: false, error: 'Hành động không hợp lệ' };
    }
  }

  placeStone(playerId, row, col) {
    // Validate move
    if (row < 0 || row >= this.boardSize || col < 0 || col >= this.boardSize) {
      return { success: false, error: 'Vị trí không hợp lệ' };
    }

    if (this.board[row][col] !== 0) {
      return { success: false, error: 'Vị trí đã có quân' };
    }

    const playerIndex = this.players.findIndex(p => p.id === playerId);
    const stoneColor = playerIndex === 0 ? 1 : 2; // 1 = black, 2 = white

    // Place stone
    this.board[row][col] = stoneColor;

    // Check for captures
    const captured = this.checkCaptures(row, col, stoneColor);
    this.capturedStones[playerId] += captured;

    // Check for suicide (ko rule simplified)
    if (captured === 0 && this.isSuicide(row, col, stoneColor)) {
      // Revert move
      this.board[row][col] = 0;
      return { success: false, error: 'Nước đi không hợp lệ: tự sát' };
    }

    // Record move
    this.moveHistory.push({ playerId, row, col, captured });
    this.passes = 0;

    this.nextTurn();
    return { 
      success: true, 
      data: { 
        row, 
        col, 
        stoneColor,
        captured 
      } 
    };
  }

  checkCaptures(row, col, stoneColor) {
    const opponentColor = stoneColor === 1 ? 2 : 1;
    let totalCaptured = 0;
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;

      if (this.isValidPosition(newRow, newCol) && 
          this.board[newRow][newCol] === opponentColor) {
        const group = this.getGroup(newRow, newCol, opponentColor);
        if (this.hasNoLiberties(group)) {
          totalCaptured += group.length;
          // Remove captured stones
          for (const [r, c] of group) {
            this.board[r][c] = 0;
          }
        }
      }
    }

    return totalCaptured;
  }

  getGroup(row, col, color) {
    const group = [];
    const visited = new Set();
    const stack = [[row, col]];

    while (stack.length > 0) {
      const [r, c] = stack.pop();
      const key = `${r},${c}`;

      if (visited.has(key)) continue;
      if (!this.isValidPosition(r, c) || this.board[r][c] !== color) continue;

      visited.add(key);
      group.push([r, c]);

      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of directions) {
        stack.push([r + dr, c + dc]);
      }
    }

    return group;
  }

  hasNoLiberties(group) {
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [row, col] of group) {
      for (const [dr, dc] of directions) {
        const newRow = row + dr;
        const newCol = col + dc;

        if (this.isValidPosition(newRow, newCol) && 
            this.board[newRow][newCol] === 0) {
          return false; // Has liberty
        }
      }
    }

    return true; // No liberties
  }

  isSuicide(row, col, stoneColor) {
    // Check if placing stone here would result in immediate capture
    const group = this.getGroup(row, col, stoneColor);
    return this.hasNoLiberties(group);
  }

  isValidPosition(row, col) {
    return row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize;
  }

  pass(playerId) {
    this.passes++;
    this.moveHistory.push({ playerId, action: 'pass' });

    // If both players pass, game ends
    if (this.passes >= 2) {
      this.gamePhase = 'finished';
      return { 
        success: true, 
        data: { 
          gameOver: true,
          message: 'Both players passed. Game ended.'
        } 
      };
    }

    this.nextTurn();
    return { success: true, data: { passed: true } };
  }

  resign(playerId) {
    this.gamePhase = 'finished';
    const winner = this.players.find(p => p.id !== playerId);
    
    return { 
      success: true, 
      data: { 
        gameOver: true,
        winner: winner.id,
        reason: 'resignation'
      } 
    };
  }

  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
  }
}

module.exports = CoVayGame;

