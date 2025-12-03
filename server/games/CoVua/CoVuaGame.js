class CoVuaGame {
  constructor(players) {
    this.players = players;
    this.currentPlayerIndex = 0; // 0 = Trắng, 1 = Đen
    this.board = this.createInitialBoard();
    this.moveHistory = [];
    this.capturedPieces = { [players[0].id]: [], [players[1].id]: [] };
    this.castlingRights = {
      white: { kingSide: true, queenSide: true },
      black: { kingSide: true, queenSide: true }
    };
    this.enPassantTarget = null; // {row, col} nếu có
    this.status = 'playing'; // playing, check, checkmate, stalemate, finished
    this.winner = null;
    this.inCheck = false;
    this.lastMove = null; // Nước cờ vừa đi để highlight
  }

  createInitialBoard() {
    // Tạo bàn cờ ban đầu
    // 0 = trống, 'P' = Tốt, 'R' = Xe, 'N' = Mã, 'B' = Tượng, 'Q' = Hậu, 'K' = Vua
    // Chữ hoa = Trắng, chữ thường = Đen
    const board = Array(8).fill(0).map(() => Array(8).fill(0));
    
    // Đặt quân cờ
    const pieces = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    for (let col = 0; col < 8; col++) {
      board[0][col] = pieces[col].toLowerCase(); // Đen ở hàng 0
      board[1][col] = 'p'; // Tốt đen
      board[6][col] = 'P'; // Tốt trắng
      board[7][col] = pieces[col]; // Trắng ở hàng 7
    }
    
    return board;
  }

  getStateForPlayer(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    const isWhite = playerIndex === 0;
    const isCurrentPlayer = this.players[this.currentPlayerIndex].id === playerId;
    
    // Calculate all valid moves for current player
    const validMoves = [];
    if (isCurrentPlayer) {
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = this.board[row][col];
          if (!piece) continue;
          const pieceIsWhite = piece === piece.toUpperCase();
          if (pieceIsWhite !== isWhite) continue;

          const moves = this.getValidMoves(row, col, isWhite);
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
      myColor: isWhite ? 'white' : 'black',
      opponentColor: isWhite ? 'black' : 'white',
      capturedPieces: {
        mine: this.capturedPieces[playerId],
        opponent: this.capturedPieces[this.players[1 - playerIndex].id]
      },
      moveHistory: this.moveHistory.slice(-10),
      lastMove: this.lastMove,
      inCheck: this.inCheck,
      status: this.status,
      winner: this.winner,
      canCastle: this.castlingRights[isWhite ? 'white' : 'black'],
      validMoves: validMoves
    };
  }

  handleAction(playerId, action, data) {
    if (action === 'undo') {
      // Undo không cần check lượt chơi, ai cũng có thể undo nước cờ của mình
      return this.undoMove(playerId);
    }

    if (this.players[this.currentPlayerIndex].id !== playerId) {
      return { success: false, error: 'Chưa đến lượt bạn' };
    }

    switch (action) {
      case 'move':
        return this.makeMove(playerId, data.fromRow, data.fromCol, data.toRow, data.toCol, data.promotion);
      case 'resign':
        return this.resign(playerId);
      default:
        return { success: false, error: 'Hành động không hợp lệ' };
    }
  }

  makeMove(playerId, fromRow, fromCol, toRow, toCol, promotion = null) {
    // Validate positions
    if (!this.isValidPosition(fromRow, fromCol) || !this.isValidPosition(toRow, toCol)) {
      return { success: false, error: 'Vị trí không hợp lệ' };
    }

    const playerIndex = this.players.findIndex(p => p.id === playerId);
    const isWhite = playerIndex === 0;
    const piece = this.board[fromRow][fromCol];

    // Check if piece exists and belongs to player
    if (!piece || (isWhite && piece === piece.toLowerCase()) || (!isWhite && piece === piece.toUpperCase())) {
      return { success: false, error: 'Không có quân cờ ở vị trí này' };
    }

    // Check if it's player's piece
    if ((isWhite && piece !== piece.toUpperCase()) || (!isWhite && piece !== piece.toLowerCase())) {
      return { success: false, error: 'Đây không phải quân cờ của bạn' };
    }

    // Get valid moves for this piece
    const validMoves = this.getValidMoves(fromRow, fromCol, isWhite);
    const moveKey = `${toRow},${toCol}`;
    
    if (!validMoves.some(m => m.row === toRow && m.col === toCol)) {
      return { success: false, error: 'Nước đi không hợp lệ' };
    }

    // Lưu trạng thái trước khi move để có thể undo
    const previousCastlingRights = JSON.parse(JSON.stringify(this.castlingRights));
    const previousEnPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : null;
    const previousStatus = this.status;
    const previousInCheck = this.inCheck;

    // Handle special moves
    const pieceType = piece.toUpperCase();
    let isCastling = false;
    let castlingInfo = null;
    let isEnPassant = false;
    let enPassantCapturedRow = null;
    let promotionPiece = null;
    let capturedPiece = this.board[toRow][toCol]; // Quân cờ bị bắt (nếu có)
    
    // Castling
    if (pieceType === 'K' && Math.abs(toCol - fromCol) === 2) {
      isCastling = true;
      const isKingSide = toCol > fromCol;
      const rookCol = isKingSide ? 7 : 0;
      const newRookCol = isKingSide ? toCol - 1 : toCol + 1;
      castlingInfo = {
        rookFrom: { row: fromRow, col: rookCol },
        rookTo: { row: fromRow, col: newRookCol },
        rookPiece: this.board[fromRow][rookCol]
      };
      capturedPiece = 0; // Castling không bắt quân
      this.handleCastling(fromRow, fromCol, toRow, toCol);
    }
    // En passant
    else if (pieceType === 'P' && this.enPassantTarget && 
             toRow === this.enPassantTarget.row && toCol === this.enPassantTarget.col) {
      isEnPassant = true;
      enPassantCapturedRow = isWhite ? toRow + 1 : toRow - 1;
      capturedPiece = this.board[enPassantCapturedRow][toCol]; // Quân cờ thực sự bị bắt
      this.capturedPieces[playerId].push(capturedPiece);
      this.board[toRow][toCol] = this.board[fromRow][fromCol];
      this.board[fromRow][fromCol] = 0;
      this.board[enPassantCapturedRow][toCol] = 0;
    }
    // Regular move
    else {
      // Xử lý captured piece cho move thường
      if (capturedPiece && capturedPiece !== 0) {
        this.capturedPieces[playerId].push(capturedPiece);
      }
      this.board[toRow][toCol] = this.board[fromRow][fromCol];
      this.board[fromRow][fromCol] = 0;
    }

    // Pawn promotion
    if (pieceType === 'P' && ((isWhite && toRow === 0) || (!isWhite && toRow === 7))) {
      promotionPiece = promotion || 'Q'; // Default to Queen
      this.board[toRow][toCol] = isWhite ? promotionPiece : promotionPiece.toLowerCase();
    }

    // Update castling rights
    this.updateCastlingRights(fromRow, fromCol, toRow, toCol);

    // Update en passant target
    this.updateEnPassantTarget(pieceType, fromRow, fromCol, toRow, toCol);

    // Record move với đầy đủ thông tin để undo
    const moveRecord = {
      playerId,
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      piece,
      captured: capturedPiece,
      previousCastlingRights,
      previousEnPassantTarget,
      previousStatus,
      previousInCheck,
      isCastling,
      castlingInfo,
      isEnPassant,
      enPassantCapturedRow,
      promotionPiece
    };
    
    this.moveHistory.push(moveRecord);

    // Set lastMove để highlight
    this.lastMove = {
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol }
    };

    // Check for check/checkmate
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

  undoMove(playerId) {
    // Kiểm tra có nước cờ nào để undo không
    if (this.moveHistory.length === 0) {
      return { success: false, error: 'Không có nước cờ nào để quay lại' };
    }

    // Lấy nước cờ cuối cùng
    const lastMove = this.moveHistory[this.moveHistory.length - 1];

    // Chỉ cho phép undo nước cờ của chính người chơi đó
    if (lastMove.playerId !== playerId) {
      return { success: false, error: 'Bạn chỉ có thể quay lại nước cờ của chính mình' };
    }

    // Khôi phục castling rights
    this.castlingRights = lastMove.previousCastlingRights;

    // Khôi phục en passant target
    this.enPassantTarget = lastMove.previousEnPassantTarget;

    // Khôi phục status và inCheck
    this.status = lastMove.previousStatus;
    this.inCheck = lastMove.previousInCheck;
    this.winner = null; // Reset winner khi undo

    // Undo castling
    if (lastMove.isCastling && lastMove.castlingInfo) {
      // Di chuyển vua về vị trí cũ
      this.board[lastMove.from.row][lastMove.from.col] = lastMove.piece;
      this.board[lastMove.to.row][lastMove.to.col] = 0;
      // Di chuyển xe về vị trí cũ
      const { rookFrom, rookTo, rookPiece } = lastMove.castlingInfo;
      this.board[rookFrom.row][rookFrom.col] = rookPiece;
      this.board[rookTo.row][rookTo.col] = 0;
    }
    // Undo en passant
    else if (lastMove.isEnPassant && lastMove.enPassantCapturedRow !== null) {
      // Di chuyển quân cờ về vị trí cũ
      this.board[lastMove.from.row][lastMove.from.col] = lastMove.piece;
      this.board[lastMove.to.row][lastMove.to.col] = 0;
      // Khôi phục quân cờ bị bắt (dùng capturedPiece đã lưu)
      if (lastMove.captured && lastMove.captured !== 0) {
        this.board[lastMove.enPassantCapturedRow][lastMove.to.col] = lastMove.captured;
        // Xóa khỏi captured pieces
        if (this.capturedPieces[lastMove.playerId].length > 0) {
          this.capturedPieces[lastMove.playerId].pop();
        }
      }
    }
    // Undo move thường
    else {
      // Di chuyển quân cờ về vị trí cũ
      // Nếu có promotion, phải khôi phục lại tốt
      const pieceToRestore = lastMove.promotionPiece ? 
        (lastMove.piece.toUpperCase() === lastMove.piece ? 'P' : 'p') : 
        lastMove.piece;
      this.board[lastMove.from.row][lastMove.from.col] = pieceToRestore;
      
      // Khôi phục quân cờ bị bắt (nếu có)
      if (lastMove.captured && lastMove.captured !== 0) {
        this.board[lastMove.to.row][lastMove.to.col] = lastMove.captured;
        // Xóa khỏi captured pieces
        if (this.capturedPieces[lastMove.playerId].length > 0) {
          this.capturedPieces[lastMove.playerId].pop();
        }
      } else {
        this.board[lastMove.to.row][lastMove.to.col] = 0;
      }
    }

    // Xóa nước cờ khỏi lịch sử
    this.moveHistory.pop();

    // Cập nhật lastMove - nước cờ trước đó (nếu còn)
    if (this.moveHistory.length > 0) {
      const prevMove = this.moveHistory[this.moveHistory.length - 1];
      this.lastMove = {
        from: prevMove.from,
        to: prevMove.to
      };
    } else {
      this.lastMove = null;
    }

    // Đổi lại lượt chơi (undo = quay lại lượt trước)
    this.currentPlayerIndex = (this.currentPlayerIndex - 1 + this.players.length) % this.players.length;

    // Kiểm tra lại trạng thái game sau khi undo
    this.checkGameStatus();

    return {
      success: true,
      data: {
        message: 'Đã quay lại nước cờ thành công'
      }
    };
  }

  getValidMoves(row, col, isWhite) {
    const piece = this.board[row][col];
    if (!piece) return [];

    const pieceType = piece.toUpperCase();
    const moves = [];

    switch (pieceType) {
      case 'P': // Pawn
        return this.getPawnMoves(row, col, isWhite);
      case 'R': // Rook
        return this.getRookMoves(row, col, isWhite);
      case 'N': // Knight
        return this.getKnightMoves(row, col, isWhite);
      case 'B': // Bishop
        return this.getBishopMoves(row, col, isWhite);
      case 'Q': // Queen
        return this.getQueenMoves(row, col, isWhite);
      case 'K': // King
        return this.getKingMoves(row, col, isWhite);
      default:
        return [];
    }
  }

  getPawnMoves(row, col, isWhite) {
    const moves = [];
    const direction = isWhite ? -1 : 1;
    const startRow = isWhite ? 6 : 1;

    // Move forward one square
    if (this.isValidPosition(row + direction, col) && this.board[row + direction][col] === 0) {
      moves.push({ row: row + direction, col });
      
      // Move forward two squares from starting position
      if (row === startRow && this.board[row + 2 * direction][col] === 0) {
        moves.push({ row: row + 2 * direction, col });
      }
    }

    // Capture diagonally
    for (const dCol of [-1, 1]) {
      const newRow = row + direction;
      const newCol = col + dCol;
      if (this.isValidPosition(newRow, newCol)) {
        const target = this.board[newRow][newCol];
        if (target && ((isWhite && target === target.toLowerCase()) || (!isWhite && target === target.toUpperCase()))) {
          moves.push({ row: newRow, col: newCol });
        }
        // En passant
        if (this.enPassantTarget && newRow === this.enPassantTarget.row && newCol === this.enPassantTarget.col) {
          moves.push({ row: newRow, col: newCol });
        }
      }
    }

    return this.filterMovesThatLeaveKingInCheck(moves, row, col, isWhite);
  }

  getRookMoves(row, col, isWhite) {
    const moves = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [dRow, dCol] of directions) {
      for (let i = 1; i < 8; i++) {
        const newRow = row + dRow * i;
        const newCol = col + dCol * i;
        if (!this.isValidPosition(newRow, newCol)) break;

        const target = this.board[newRow][newCol];
        if (target === 0) {
          moves.push({ row: newRow, col: newCol });
        } else {
          if ((isWhite && target === target.toLowerCase()) || (!isWhite && target === target.toUpperCase())) {
            moves.push({ row: newRow, col: newCol });
          }
          break;
        }
      }
    }

    return this.filterMovesThatLeaveKingInCheck(moves, row, col, isWhite);
  }

  getKnightMoves(row, col, isWhite) {
    const moves = [];
    const offsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

    for (const [dRow, dCol] of offsets) {
      const newRow = row + dRow;
      const newCol = col + dCol;
      if (!this.isValidPosition(newRow, newCol)) continue;

      const target = this.board[newRow][newCol];
      if (target === 0 || (isWhite && target === target.toLowerCase()) || (!isWhite && target === target.toUpperCase())) {
        moves.push({ row: newRow, col: newCol });
      }
    }

    return this.filterMovesThatLeaveKingInCheck(moves, row, col, isWhite);
  }

  getBishopMoves(row, col, isWhite) {
    const moves = [];
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (const [dRow, dCol] of directions) {
      for (let i = 1; i < 8; i++) {
        const newRow = row + dRow * i;
        const newCol = col + dCol * i;
        if (!this.isValidPosition(newRow, newCol)) break;

        const target = this.board[newRow][newCol];
        if (target === 0) {
          moves.push({ row: newRow, col: newCol });
        } else {
          if ((isWhite && target === target.toLowerCase()) || (!isWhite && target === target.toUpperCase())) {
            moves.push({ row: newRow, col: newCol });
          }
          break;
        }
      }
    }

    return this.filterMovesThatLeaveKingInCheck(moves, row, col, isWhite);
  }

  getQueenMoves(row, col, isWhite) {
    return [...this.getRookMoves(row, col, isWhite), ...this.getBishopMoves(row, col, isWhite)];
  }

  getKingMoves(row, col, isWhite) {
    const moves = [];
    const offsets = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

    for (const [dRow, dCol] of offsets) {
      const newRow = row + dRow;
      const newCol = col + dCol;
      if (!this.isValidPosition(newRow, newCol)) continue;

      const target = this.board[newRow][newCol];
      if (target === 0 || (isWhite && target === target.toLowerCase()) || (!isWhite && target === target.toUpperCase())) {
        moves.push({ row: newRow, col: newCol });
      }
    }

    // Castling
    const castlingRights = this.castlingRights[isWhite ? 'white' : 'black'];
    if (castlingRights.kingSide && this.canCastleKingSide(row, col, isWhite)) {
      moves.push({ row, col: col + 2 });
    }
    if (castlingRights.queenSide && this.canCastleQueenSide(row, col, isWhite)) {
      moves.push({ row, col: col - 2 });
    }

    return this.filterMovesThatLeaveKingInCheck(moves, row, col, isWhite);
  }

  canCastleKingSide(row, col, isWhite) {
    // Check if squares between king and rook are empty
    if (this.board[row][col + 1] !== 0 || this.board[row][col + 2] !== 0) {
      return false;
    }
    // Check if king is in check or would pass through check
    if (this.isSquareUnderAttack(row, col, !isWhite) || 
        this.isSquareUnderAttack(row, col + 1, !isWhite) ||
        this.isSquareUnderAttack(row, col + 2, !isWhite)) {
      return false;
    }
    return true;
  }

  canCastleQueenSide(row, col, isWhite) {
    // Check if squares between king and rook are empty
    if (this.board[row][col - 1] !== 0 || this.board[row][col - 2] !== 0 || this.board[row][col - 3] !== 0) {
      return false;
    }
    // Check if king is in check or would pass through check
    if (this.isSquareUnderAttack(row, col, !isWhite) || 
        this.isSquareUnderAttack(row, col - 1, !isWhite) ||
        this.isSquareUnderAttack(row, col - 2, !isWhite)) {
      return false;
    }
    return true;
  }

  handleCastling(fromRow, fromCol, toRow, toCol) {
    const isWhite = this.board[fromRow][fromCol] === this.board[fromRow][fromCol].toUpperCase();
    const isKingSide = toCol > fromCol;

    // Move king
    this.board[toRow][toCol] = this.board[fromRow][fromCol];
    this.board[fromRow][fromCol] = 0;

    // Move rook
    const rookCol = isKingSide ? 7 : 0;
    const newRookCol = isKingSide ? toCol - 1 : toCol + 1;
    this.board[toRow][newRookCol] = this.board[toRow][rookCol];
    this.board[toRow][rookCol] = 0;
  }

  updateCastlingRights(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[toRow][toCol];
    const pieceType = piece.toUpperCase();
    const isWhite = piece === piece.toUpperCase();

    // If king moves, lose all castling rights
    if (pieceType === 'K') {
      this.castlingRights[isWhite ? 'white' : 'black'] = { kingSide: false, queenSide: false };
    }
    // If rook moves, lose that side's castling right
    else if (pieceType === 'R') {
      if (fromCol === 0) {
        this.castlingRights[isWhite ? 'white' : 'black'].queenSide = false;
      } else if (fromCol === 7) {
        this.castlingRights[isWhite ? 'white' : 'black'].kingSide = false;
      }
    }
    // If rook is captured, lose that side's castling right
    if (toRow === 0 || toRow === 7) {
      if (toCol === 0) {
        this.castlingRights[isWhite ? 'black' : 'white'].queenSide = false;
      } else if (toCol === 7) {
        this.castlingRights[isWhite ? 'black' : 'white'].kingSide = false;
      }
    }
  }

  updateEnPassantTarget(pieceType, fromRow, fromCol, toRow, toCol) {
    // Set en passant target if pawn moves two squares
    if (pieceType === 'P' && Math.abs(toRow - fromRow) === 2) {
      this.enPassantTarget = { row: (fromRow + toRow) / 2, col: toCol };
    } else {
      this.enPassantTarget = null;
    }
  }

  isSquareUnderAttack(row, col, byWhite) {
    // Check if any opponent piece can attack this square
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (!piece) continue;
        const pieceIsWhite = piece === piece.toUpperCase();
        if (pieceIsWhite !== byWhite) continue;

        const moves = this.getValidMovesWithoutCheckFilter(r, c, pieceIsWhite);
        if (moves.some(m => m.row === row && m.col === col)) {
          return true;
        }
      }
    }
    return false;
  }

  getValidMovesWithoutCheckFilter(row, col, isWhite) {
    // Same as getValidMoves but without filtering moves that leave king in check
    const piece = this.board[row][col];
    if (!piece) return [];

    const pieceType = piece.toUpperCase();
    switch (pieceType) {
      case 'P':
        return this.getPawnMovesWithoutCheckFilter(row, col, isWhite);
      case 'R':
        return this.getRookMovesWithoutCheckFilter(row, col, isWhite);
      case 'N':
        return this.getKnightMovesWithoutCheckFilter(row, col, isWhite);
      case 'B':
        return this.getBishopMovesWithoutCheckFilter(row, col, isWhite);
      case 'Q':
        return [...this.getRookMovesWithoutCheckFilter(row, col, isWhite), 
                ...this.getBishopMovesWithoutCheckFilter(row, col, isWhite)];
      case 'K':
        return this.getKingMovesWithoutCheckFilter(row, col, isWhite);
      default:
        return [];
    }
  }

  getPawnMovesWithoutCheckFilter(row, col, isWhite) {
    const moves = [];
    const direction = isWhite ? -1 : 1;
    const startRow = isWhite ? 6 : 1;

    if (this.isValidPosition(row + direction, col) && this.board[row + direction][col] === 0) {
      moves.push({ row: row + direction, col });
      if (row === startRow && this.board[row + 2 * direction][col] === 0) {
        moves.push({ row: row + 2 * direction, col });
      }
    }

    for (const dCol of [-1, 1]) {
      const newRow = row + direction;
      const newCol = col + dCol;
      if (this.isValidPosition(newRow, newCol)) {
        const target = this.board[newRow][newCol];
        if (target && ((isWhite && target === target.toLowerCase()) || (!isWhite && target === target.toUpperCase()))) {
          moves.push({ row: newRow, col: newCol });
        }
      }
    }

    return moves;
  }

  getRookMovesWithoutCheckFilter(row, col, isWhite) {
    const moves = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [dRow, dCol] of directions) {
      for (let i = 1; i < 8; i++) {
        const newRow = row + dRow * i;
        const newCol = col + dCol * i;
        if (!this.isValidPosition(newRow, newCol)) break;

        const target = this.board[newRow][newCol];
        if (target === 0) {
          moves.push({ row: newRow, col: newCol });
        } else {
          if ((isWhite && target === target.toLowerCase()) || (!isWhite && target === target.toUpperCase())) {
            moves.push({ row: newRow, col: newCol });
          }
          break;
        }
      }
    }

    return moves;
  }

  getKnightMovesWithoutCheckFilter(row, col, isWhite) {
    const moves = [];
    const offsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

    for (const [dRow, dCol] of offsets) {
      const newRow = row + dRow;
      const newCol = col + dCol;
      if (!this.isValidPosition(newRow, newCol)) continue;

      const target = this.board[newRow][newCol];
      if (target === 0 || (isWhite && target === target.toLowerCase()) || (!isWhite && target === target.toUpperCase())) {
        moves.push({ row: newRow, col: newCol });
      }
    }

    return moves;
  }

  getBishopMovesWithoutCheckFilter(row, col, isWhite) {
    const moves = [];
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (const [dRow, dCol] of directions) {
      for (let i = 1; i < 8; i++) {
        const newRow = row + dRow * i;
        const newCol = col + dCol * i;
        if (!this.isValidPosition(newRow, newCol)) break;

        const target = this.board[newRow][newCol];
        if (target === 0) {
          moves.push({ row: newRow, col: newCol });
        } else {
          if ((isWhite && target === target.toLowerCase()) || (!isWhite && target === target.toUpperCase())) {
            moves.push({ row: newRow, col: newCol });
          }
          break;
        }
      }
    }

    return moves;
  }

  getKingMovesWithoutCheckFilter(row, col, isWhite) {
    const moves = [];
    const offsets = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

    for (const [dRow, dCol] of offsets) {
      const newRow = row + dRow;
      const newCol = col + dCol;
      if (!this.isValidPosition(newRow, newCol)) continue;

      const target = this.board[newRow][newCol];
      if (target === 0 || (isWhite && target === target.toLowerCase()) || (!isWhite && target === target.toUpperCase())) {
        moves.push({ row: newRow, col: newCol });
      }
    }

    return moves;
  }

  filterMovesThatLeaveKingInCheck(moves, fromRow, fromCol, isWhite) {
    // Simulate each move and check if king is in check
    const validMoves = [];
    const originalPiece = this.board[fromRow][fromCol];
    const kingPos = this.findKing(isWhite);

    for (const move of moves) {
      // Make temporary move
      const captured = this.board[move.row][move.col];
      this.board[move.row][move.col] = originalPiece;
      this.board[fromRow][fromCol] = 0;

      // Update king position if king moved
      let currentKingPos = kingPos;
      if (originalPiece.toUpperCase() === 'K') {
        currentKingPos = { row: move.row, col: move.col };
      }

      // Check if king is in check
      if (!this.isSquareUnderAttack(currentKingPos.row, currentKingPos.col, !isWhite)) {
        validMoves.push(move);
      }

      // Restore board
      this.board[fromRow][fromCol] = originalPiece;
      this.board[move.row][move.col] = captured;
    }

    return validMoves;
  }

  findKing(isWhite) {
    const king = isWhite ? 'K' : 'k';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (this.board[row][col] === king) {
          return { row, col };
        }
      }
    }
    return null;
  }

  checkGameStatus() {
    const currentPlayerIndex = this.currentPlayerIndex;
    const isWhite = currentPlayerIndex === 0;
    const kingPos = this.findKing(isWhite);

    if (!kingPos) {
      this.status = 'checkmate';
      this.winner = this.players[1 - currentPlayerIndex].id;
      return;
    }

    // Check if king is in check
    this.inCheck = this.isSquareUnderAttack(kingPos.row, kingPos.col, !isWhite);

    // Check if player has any valid moves
    let hasValidMoves = false;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (!piece) continue;
        const pieceIsWhite = piece === piece.toUpperCase();
        if (pieceIsWhite !== isWhite) continue;

        const moves = this.getValidMoves(row, col, isWhite);
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
      }
    } else if (this.inCheck) {
      this.status = 'check';
    } else {
      this.status = 'playing';
    }
  }

  resign(playerId) {
    this.status = 'finished';
    const winner = this.players.find(p => p.id !== playerId);
    this.winner = winner ? winner.id : null;

    return {
      success: true,
      data: {
        gameOver: true,
        winner: this.winner,
        reason: 'resignation'
      }
    };
  }

  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
  }

  isValidPosition(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }
}

module.exports = CoVuaGame;

