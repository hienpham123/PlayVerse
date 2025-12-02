class CoTuongGame {
  constructor(players) {
    this.players = players;
    this.currentPlayerIndex = 0; // 0 = Đỏ (dưới), 1 = Đen (trên)
    this.board = this.createInitialBoard();
    this.moveHistory = [];
    this.capturedPieces = { [players[0].id]: [], [players[1].id]: [] };
    this.status = 'playing'; // playing, check, checkmate, finished
    this.winner = null;
    this.inCheck = false;
    this.lastMove = null;
  }

  createInitialBoard() {
    // Bàn cờ tướng: 10 hàng x 9 cột
    // 0 = trống
    // Đỏ (dưới): 'K' = Tướng, 'A' = Sĩ, 'E' = Tượng, 'R' = Xe, 'C' = Pháo, 'H' = Mã, 'P' = Tốt
    // Đen (trên): 'k' = Tướng, 'a' = Sĩ, 'e' = Tượng, 'r' = Xe, 'c' = Pháo, 'h' = Mã, 'p' = Tốt
    const board = Array(10).fill(0).map(() => Array(9).fill(0));
    
    // Đặt quân Đen (trên) - hàng 0-2
    board[0] = ['r', 'h', 'e', 'a', 'k', 'a', 'e', 'h', 'r']; // Xe, Mã, Tượng, Sĩ, Tướng, Sĩ, Tượng, Mã, Xe
    board[2] = [0, 'c', 0, 0, 0, 0, 0, 'c', 0]; // Pháo
    board[3] = ['p', 0, 'p', 0, 'p', 0, 'p', 0, 'p']; // Tốt
    
    // Đặt quân Đỏ (dưới) - hàng 6-9
    board[6] = ['P', 0, 'P', 0, 'P', 0, 'P', 0, 'P']; // Tốt
    board[7] = [0, 'C', 0, 0, 0, 0, 0, 'C', 0]; // Pháo
    board[9] = ['R', 'H', 'E', 'A', 'K', 'A', 'E', 'H', 'R']; // Xe, Mã, Tượng, Sĩ, Tướng, Sĩ, Tượng, Mã, Xe
    
    return board;
  }

  getStateForPlayer(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    const isRed = playerIndex === 0;
    const isCurrentPlayer = this.players[this.currentPlayerIndex].id === playerId;
    
    // Tính toán các nước đi hợp lệ
    const validMoves = [];
    if (isCurrentPlayer) {
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
          const piece = this.board[row][col];
          if (!piece) continue;
          const pieceIsRed = piece === piece.toUpperCase();
          if (pieceIsRed !== isRed) continue;

          const moves = this.getValidMoves(row, col, isRed);
          for (const move of moves) {
            validMoves.push({
              fromRow: row,
              fromCol: col,
              toRow: move.row,
              toCol: move.col
            });
          }
        }
      }
    }
    
    return {
      currentPlayerId: this.players[this.currentPlayerIndex].id,
      board: this.board,
      myColor: isRed ? 'red' : 'black',
      opponentColor: isRed ? 'black' : 'red',
      capturedPieces: {
        mine: this.capturedPieces[playerId],
        opponent: this.capturedPieces[this.players[1 - playerIndex].id]
      },
      moveHistory: this.moveHistory.slice(-10),
      lastMove: this.lastMove,
      inCheck: this.inCheck,
      status: this.status,
      winner: this.winner,
      validMoves: validMoves
    };
  }

  handleAction(playerId, action, data) {
    if (this.players[this.currentPlayerIndex].id !== playerId) {
      return { success: false, error: 'Chưa đến lượt bạn' };
    }

    switch (action) {
      case 'move':
        return this.makeMove(playerId, data.fromRow, data.fromCol, data.toRow, data.toCol);
      case 'resign':
        return this.resign(playerId);
      default:
        return { success: false, error: 'Hành động không hợp lệ' };
    }
  }

  isValidPosition(row, col) {
    return row >= 0 && row < 10 && col >= 0 && col < 9;
  }

  isInPalace(row, col, isRed) {
    // Cung: 3x3 ở hai đầu bàn cờ
    if (isRed) {
      return row >= 7 && row <= 9 && col >= 3 && col <= 5;
    } else {
      return row >= 0 && row <= 2 && col >= 3 && col <= 5;
    }
  }

  isAcrossRiver(row, isRed) {
    // Sông ở giữa, hàng 4-5
    if (isRed) {
      return row <= 4; // Đỏ qua sông là từ hàng 6 xuống
    } else {
      return row >= 5; // Đen qua sông là từ hàng 3 lên
    }
  }

  getValidMoves(row, col, isRed) {
    const piece = this.board[row][col];
    if (!piece) return [];
    
    const pieceType = piece.toUpperCase();
    const moves = [];

    switch (pieceType) {
      case 'K': // Tướng
        moves.push(...this.getKingMoves(row, col, isRed));
        break;
      case 'A': // Sĩ
        moves.push(...this.getAdvisorMoves(row, col, isRed));
        break;
      case 'E': // Tượng
        moves.push(...this.getElephantMoves(row, col, isRed));
        break;
      case 'R': // Xe
        moves.push(...this.getRookMoves(row, col, isRed));
        break;
      case 'C': // Pháo
        moves.push(...this.getCannonMoves(row, col, isRed));
        break;
      case 'H': // Mã
        moves.push(...this.getHorseMoves(row, col, isRed));
        break;
      case 'P': // Tốt
        moves.push(...this.getPawnMoves(row, col, isRed));
        break;
    }

    // Lọc các nước đi không hợp lệ (không để Tướng bị chiếu)
    return moves.filter(move => {
      // Tạm thời thực hiện nước đi
      const originalPiece = this.board[move.row][move.col];
      this.board[move.row][move.col] = this.board[row][col];
      this.board[row][col] = 0;
      
      // Kiểm tra xem Tướng có bị chiếu không
      const wouldBeInCheck = this.isInCheck(isRed);
      
      // Khôi phục
      this.board[row][col] = this.board[move.row][move.col];
      this.board[move.row][move.col] = originalPiece;
      
      return !wouldBeInCheck;
    });
  }

  getKingMoves(row, col, isRed) {
    const moves = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // Lên, xuống, trái, phải
    
    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      
      if (!this.isValidPosition(newRow, newCol)) continue;
      if (!this.isInPalace(newRow, newCol, isRed)) continue;
      
      const targetPiece = this.board[newRow][newCol];
      if (!targetPiece || (isRed && targetPiece === targetPiece.toLowerCase()) || 
          (!isRed && targetPiece === targetPiece.toUpperCase())) {
        moves.push({ row: newRow, col: newCol });
      }
    }

    // Kiểm tra đối mặt Tướng (flying king)
    moves.push(...this.getFlyingKingMoves(row, col, isRed));
    
    return moves;
  }

  getFlyingKingMoves(row, col, isRed) {
    const moves = [];
    const kingCol = col;
    
    if (isRed) {
      // Đỏ kiểm tra từ hàng 7-9
      for (let checkRow = row - 1; checkRow >= 0; checkRow--) {
        const piece = this.board[checkRow][kingCol];
        if (piece) {
          if (piece.toLowerCase() === 'k') {
            // Đối mặt với Tướng đen
            // Kiểm tra xem có quân nào ở giữa không
            let hasPieceBetween = false;
            for (let betweenRow = checkRow + 1; betweenRow < row; betweenRow++) {
              if (this.board[betweenRow][kingCol]) {
                hasPieceBetween = true;
                break;
              }
            }
            if (!hasPieceBetween) {
              // Có thể di chuyển để đối mặt
              for (let moveRow = row - 1; moveRow >= checkRow; moveRow--) {
                if (this.isInPalace(moveRow, kingCol, isRed)) {
                  moves.push({ row: moveRow, col: kingCol });
                }
              }
            }
          }
          break; // Gặp quân cờ thì dừng
        }
      }
    } else {
      // Đen kiểm tra từ hàng 0-2
      for (let checkRow = row + 1; checkRow < 10; checkRow++) {
        const piece = this.board[checkRow][kingCol];
        if (piece) {
          if (piece.toUpperCase() === 'K') {
            // Đối mặt với Tướng đỏ
            let hasPieceBetween = false;
            for (let betweenRow = row + 1; betweenRow < checkRow; betweenRow++) {
              if (this.board[betweenRow][kingCol]) {
                hasPieceBetween = true;
                break;
              }
            }
            if (!hasPieceBetween) {
              for (let moveRow = row + 1; moveRow <= checkRow; moveRow++) {
                if (this.isInPalace(moveRow, kingCol, isRed)) {
                  moves.push({ row: moveRow, col: kingCol });
                }
              }
            }
          }
          break;
        }
      }
    }
    
    return moves;
  }

  getAdvisorMoves(row, col, isRed) {
    const moves = [];
    // Sĩ đi chéo trong cung
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    
    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      
      if (!this.isValidPosition(newRow, newCol)) continue;
      if (!this.isInPalace(newRow, newCol, isRed)) continue;
      
      const targetPiece = this.board[newRow][newCol];
      if (!targetPiece || (isRed && targetPiece === targetPiece.toLowerCase()) || 
          (!isRed && targetPiece === targetPiece.toUpperCase())) {
        moves.push({ row: newRow, col: newCol });
      }
    }
    
    return moves;
  }

  getElephantMoves(row, col, isRed) {
    const moves = [];
    // Tượng đi chéo 2 ô và không được qua sông
    const directions = [[-2, -2], [-2, 2], [2, -2], [2, 2]];
    
    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      
      if (!this.isValidPosition(newRow, newCol)) continue;
      if (this.isAcrossRiver(newRow, isRed)) continue; // Không được qua sông
      
      // Kiểm tra có quân chặn ở giữa không
      const blockRow = row + dr / 2;
      const blockCol = col + dc / 2;
      if (this.board[blockRow][blockCol]) continue;
      
      const targetPiece = this.board[newRow][newCol];
      if (!targetPiece || (isRed && targetPiece === targetPiece.toLowerCase()) || 
          (!isRed && targetPiece === targetPiece.toUpperCase())) {
        moves.push({ row: newRow, col: newCol });
      }
    }
    
    return moves;
  }

  getRookMoves(row, col, isRed) {
    const moves = [];
    // Xe đi thẳng
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    for (const [dr, dc] of directions) {
      for (let i = 1; i < 10; i++) {
        const newRow = row + dr * i;
        const newCol = col + dc * i;
        
        if (!this.isValidPosition(newRow, newCol)) break;
        
        const targetPiece = this.board[newRow][newCol];
        if (!targetPiece) {
          moves.push({ row: newRow, col: newCol });
        } else {
          // Có quân cờ, có thể bắt nếu là quân đối phương
          if ((isRed && targetPiece === targetPiece.toLowerCase()) || 
              (!isRed && targetPiece === targetPiece.toUpperCase())) {
            moves.push({ row: newRow, col: newCol });
          }
          break;
        }
      }
    }
    
    return moves;
  }

  getCannonMoves(row, col, isRed) {
    const moves = [];
    // Pháo đi thẳng như Xe, nhưng bắt quân phải nhảy qua 1 quân
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    for (const [dr, dc] of directions) {
      let pieceCount = 0;
      
      for (let i = 1; i < 10; i++) {
        const newRow = row + dr * i;
        const newCol = col + dc * i;
        
        if (!this.isValidPosition(newRow, newCol)) break;
        
        const targetPiece = this.board[newRow][newCol];
        
        if (!targetPiece) {
          // Không có quân, có thể đi
          if (pieceCount === 0) {
            moves.push({ row: newRow, col: newCol });
          }
        } else {
          pieceCount++;
          if (pieceCount === 1) {
            // Có 1 quân chặn, không thể đi nhưng có thể bắt
          } else if (pieceCount === 2) {
            // Có 2 quân, quân thứ 2 có thể bị bắt nếu là quân đối phương
            if ((isRed && targetPiece === targetPiece.toLowerCase()) || 
                (!isRed && targetPiece === targetPiece.toUpperCase())) {
              moves.push({ row: newRow, col: newCol });
            }
            break;
          }
        }
      }
    }
    
    return moves;
  }

  getHorseMoves(row, col, isRed) {
    const moves = [];
    // Mã đi chữ L: 2 ô thẳng + 1 ô ngang, hoặc 2 ô ngang + 1 ô thẳng
    const horseMoves = [
      [-2, -1], [-2, 1], [2, -1], [2, 1], // Dọc trước
      [-1, -2], [-1, 2], [1, -2], [1, 2]  // Ngang trước
    ];
    
    for (const [dr, dc] of horseMoves) {
      const newRow = row + dr;
      const newCol = col + dc;
      
      if (!this.isValidPosition(newRow, newCol)) continue;
      
      // Kiểm tra chân Mã (ô chặn)
      let blockRow, blockCol;
      if (Math.abs(dr) === 2) {
        blockRow = row + dr / 2;
        blockCol = col;
      } else {
        blockRow = row;
        blockCol = col + dc / 2;
      }
      
      if (this.board[blockRow][blockCol]) continue; // Bị chặn
      
      const targetPiece = this.board[newRow][newCol];
      if (!targetPiece || (isRed && targetPiece === targetPiece.toLowerCase()) || 
          (!isRed && targetPiece === targetPiece.toUpperCase())) {
        moves.push({ row: newRow, col: newCol });
      }
    }
    
    return moves;
  }

  getPawnMoves(row, col, isRed) {
    const moves = [];
    const acrossRiver = this.isAcrossRiver(row, isRed);
    
    if (isRed) {
      // Tốt Đỏ: đi lên
      if (row > 0) {
        const newRow = row - 1;
        const targetPiece = this.board[newRow][col];
        if (!targetPiece || targetPiece === targetPiece.toLowerCase()) {
          moves.push({ row: newRow, col });
        }
      }
      
      // Sau khi qua sông, có thể đi ngang
      if (acrossRiver) {
        if (col > 0) {
          const targetPiece = this.board[row][col - 1];
          if (!targetPiece || targetPiece === targetPiece.toLowerCase()) {
            moves.push({ row, col: col - 1 });
          }
        }
        if (col < 8) {
          const targetPiece = this.board[row][col + 1];
          if (!targetPiece || targetPiece === targetPiece.toLowerCase()) {
            moves.push({ row, col: col + 1 });
          }
        }
      }
    } else {
      // Tốt Đen: đi xuống
      if (row < 9) {
        const newRow = row + 1;
        const targetPiece = this.board[newRow][col];
        if (!targetPiece || targetPiece === targetPiece.toUpperCase()) {
          moves.push({ row: newRow, col });
        }
      }
      
      // Sau khi qua sông, có thể đi ngang
      if (acrossRiver) {
        if (col > 0) {
          const targetPiece = this.board[row][col - 1];
          if (!targetPiece || targetPiece === targetPiece.toUpperCase()) {
            moves.push({ row, col: col - 1 });
          }
        }
        if (col < 8) {
          const targetPiece = this.board[row][col + 1];
          if (!targetPiece || targetPiece === targetPiece.toUpperCase()) {
            moves.push({ row, col: col + 1 });
          }
        }
      }
    }
    
    return moves;
  }

  isInCheck(isRed) {
    // Tìm vị trí Tướng
    let kingRow = -1, kingCol = -1;
    const kingSymbol = isRed ? 'K' : 'k';
    
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        if (this.board[row][col] === kingSymbol) {
          kingRow = row;
          kingCol = col;
          break;
        }
      }
      if (kingRow !== -1) break;
    }
    
    if (kingRow === -1) return false;
    
    // Kiểm tra xem có quân đối phương nào có thể bắt Tướng không
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        const piece = this.board[row][col];
        if (!piece) continue;
        
        const pieceIsRed = piece === piece.toUpperCase();
        if (pieceIsRed === isRed) continue; // Quân cùng màu
        
        // Kiểm tra xem quân này có thể bắt Tướng không
        const moves = this.getValidMovesWithoutCheck(row, col, !isRed);
        if (moves.some(m => m.row === kingRow && m.col === kingCol)) {
          return true;
        }
      }
    }
    
    return false;
  }

  getValidMovesWithoutCheck(row, col, isRed) {
    // Tương tự getValidMoves nhưng không lọc check
    const piece = this.board[row][col];
    if (!piece) return [];
    
    const pieceType = piece.toUpperCase();
    const moves = [];

    switch (pieceType) {
      case 'K':
        moves.push(...this.getKingMoves(row, col, isRed));
        break;
      case 'A':
        moves.push(...this.getAdvisorMoves(row, col, isRed));
        break;
      case 'E':
        moves.push(...this.getElephantMoves(row, col, isRed));
        break;
      case 'R':
        moves.push(...this.getRookMoves(row, col, isRed));
        break;
      case 'C':
        moves.push(...this.getCannonMoves(row, col, isRed));
        break;
      case 'H':
        moves.push(...this.getHorseMoves(row, col, isRed));
        break;
      case 'P':
        moves.push(...this.getPawnMoves(row, col, isRed));
        break;
    }

    return moves;
  }

  makeMove(playerId, fromRow, fromCol, toRow, toCol) {
    if (!this.isValidPosition(fromRow, fromCol) || !this.isValidPosition(toRow, toCol)) {
      return { success: false, error: 'Vị trí không hợp lệ' };
    }

    const playerIndex = this.players.findIndex(p => p.id === playerId);
    const isRed = playerIndex === 0;
    const piece = this.board[fromRow][fromCol];

    if (!piece || (isRed && piece === piece.toLowerCase()) || (!isRed && piece === piece.toUpperCase())) {
      return { success: false, error: 'Không có quân cờ ở vị trí này' };
    }

    const validMoves = this.getValidMoves(fromRow, fromCol, isRed);
    if (!validMoves.some(m => m.row === toRow && m.col === toCol)) {
      return { success: false, error: 'Nước đi không hợp lệ' };
    }

    const capturedPiece = this.board[toRow][toCol];
    if (capturedPiece && capturedPiece !== 0) {
      this.capturedPieces[playerId].push(capturedPiece);
    }

    this.board[toRow][toCol] = this.board[fromRow][fromCol];
    this.board[fromRow][fromCol] = 0;

    // Ghi lại nước đi
    this.moveHistory.push({
      playerId,
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      piece,
      captured: capturedPiece
    });

    this.lastMove = {
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol }
    };

    this.nextTurn();
    this.checkGameStatus();

    return {
      success: true,
      data: {
        from: { row: fromRow, col: fromCol },
        to: { row: toRow, col: toCol },
        piece,
        captured: capturedPiece
      }
    };
  }

  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
  }

  checkGameStatus() {
    const currentPlayerIndex = this.currentPlayerIndex;
    const isRed = currentPlayerIndex === 0;
    this.inCheck = this.isInCheck(isRed);

    // Kiểm tra xem có nước đi hợp lệ nào không
    let hasValidMoves = false;
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        const piece = this.board[row][col];
        if (!piece) continue;
        const pieceIsRed = piece === piece.toUpperCase();
        if (pieceIsRed !== isRed) continue;

        const moves = this.getValidMoves(row, col, isRed);
        if (moves.length > 0) {
          hasValidMoves = true;
          break;
        }
      }
      if (hasValidMoves) break;
    }

    if (!hasValidMoves) {
      if (this.inCheck) {
        this.status = 'checkmate';
        this.winner = this.players[1 - currentPlayerIndex].id;
      } else {
        this.status = 'stalemate';
        this.winner = null;
      }
      this.status = 'finished';
    } else if (this.inCheck) {
      this.status = 'check';
    } else {
      this.status = 'playing';
    }
  }

  resign(playerId) {
    this.status = 'finished';
    this.winner = this.players.find(p => p.id !== playerId).id;
    return { success: true, data: { gameOver: true, winner: this.winner } };
  }
}

module.exports = CoTuongGame;

