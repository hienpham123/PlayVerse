/**
 * Hệ thống Bot AI chung cho các game
 * Hỗ trợ 3 mức độ khó: easy, medium, hard
 */

class BotAI {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty; // 'easy', 'medium', 'hard'
  }

  /**
   * Bot cho game Cờ XO (Gomoku - 5 quân liên tiếp)
   */
  getXOMove(board, symbol, opponentSymbol) {
    const boardSize = board.length;
    const winLength = 5; // Gomoku cần 5 quân liên tiếp
    const emptyCells = [];
    
    // Tìm tất cả ô trống gần các quân cờ (tối ưu hiệu suất)
    const nearbyCells = new Set();
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (board[row][col] !== null) {
          // Thêm các ô xung quanh quân cờ
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = row + dr;
              const nc = col + dc;
              if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && board[nr][nc] === null) {
                nearbyCells.add(`${nr},${nc}`);
              }
            }
          }
        }
      }
    }

    // Nếu bàn cờ trống, đánh ở giữa
    if (nearbyCells.size === 0) {
      const center = Math.floor(boardSize / 2);
      return { row: center, col: center };
    }

    // Chuyển Set thành mảng
    for (const cellStr of nearbyCells) {
      const [row, col] = cellStr.split(',').map(Number);
      emptyCells.push({ row, col });
    }

    // Thêm tất cả ô trống nếu không có nhiều lựa chọn
    if (emptyCells.length < 10) {
      for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
          if (board[row][col] === null && !emptyCells.some(c => c.row === row && c.col === col)) {
            emptyCells.push({ row, col });
          }
        }
      }
    }

    if (emptyCells.length === 0) return null;

    // EASY: Chọn ngẫu nhiên trong các ô gần quân cờ
    if (this.difficulty === 'easy') {
      // 70% chọn ngẫu nhiên, 30% chọn vị trí tốt hơn
      if (Math.random() < 0.7) {
        const random = Math.floor(Math.random() * emptyCells.length);
        return emptyCells[random];
      }
      // 30% sử dụng logic cơ bản
    }

    // MEDIUM và HARD: Phân tích pattern và chiến lược
    
    // 1. Kiểm tra xem có thể thắng ngay không (5 quân liên tiếp)
    for (const cell of emptyCells) {
      board[cell.row][cell.col] = symbol;
      if (this.checkXOWin(board, cell.row, cell.col, symbol, winLength)) {
        board[cell.row][cell.col] = null;
        return cell;
      }
      board[cell.row][cell.col] = null;
    }

    // 2. Chặn đối thủ thắng (5 quân liên tiếp)
    for (const cell of emptyCells) {
      board[cell.row][cell.col] = opponentSymbol;
      if (this.checkXOWin(board, cell.row, cell.col, opponentSymbol, winLength)) {
        board[cell.row][cell.col] = null;
        return cell;
      }
      board[cell.row][cell.col] = null;
    }

    // 3. Phân tích các pattern nguy hiểm
    const patternAnalysis = this.analyzeXOPatterns(board, emptyCells, symbol, opponentSymbol, winLength);

    // 4. Tấn công: Tạo 4 mở (4 quân có 2 đầu tự do)
    if (patternAnalysis.myOpenFour.length > 0) {
      return patternAnalysis.myOpenFour[0].cell;
    }

    // 5. Phòng thủ: Chặn 4 mở của đối thủ
    if (patternAnalysis.oppOpenFour.length > 0) {
      return patternAnalysis.oppOpenFour[0].cell;
    }

    // 6. Tấn công: Tạo 4 chặn 1 đầu (4 quân có 1 đầu tự do)
    if (patternAnalysis.myFourBlocked.length > 0) {
      return patternAnalysis.myFourBlocked[0].cell;
    }

    // 7. Phòng thủ: Chặn 4 chặn 1 đầu của đối thủ
    if (patternAnalysis.oppFourBlocked.length > 0) {
      return patternAnalysis.oppFourBlocked[0].cell;
    }

    // 8. Tấn công: Tạo 3 mở (3 quân có 2 đầu tự do)
    if (patternAnalysis.myOpenThree.length > 0) {
      return patternAnalysis.myOpenThree[0].cell;
    }

    // 9. Phòng thủ: Chặn 3 mở của đối thủ
    if (patternAnalysis.oppOpenThree.length > 0) {
      return patternAnalysis.oppOpenThree[0].cell;
    }

    // MEDIUM: Sử dụng đánh giá điểm số với một chút ngẫu nhiên
    if (this.difficulty === 'medium') {
      const evaluatedMoves = emptyCells.map(cell => ({
        cell,
        score: this.evaluateXOCell(board, cell.row, cell.col, symbol, opponentSymbol, winLength)
      }));

      evaluatedMoves.sort((a, b) => b.score - a.score);
      
      // Chọn trong top 5 nước đi tốt nhất
      const topMoves = evaluatedMoves.slice(0, Math.min(5, evaluatedMoves.length));
      const selected = topMoves[Math.floor(Math.random() * topMoves.length)];
      return selected.cell;
    }

    // HARD: Sử dụng Minimax với độ sâu nông hoặc đánh giá tốt nhất
    if (this.difficulty === 'hard') {
      const evaluatedMoves = emptyCells.map(cell => ({
        cell,
        score: this.evaluateXOCell(board, cell.row, cell.col, symbol, opponentSymbol, winLength)
      }));

      evaluatedMoves.sort((a, b) => b.score - a.score);

      // Sử dụng Minimax với độ sâu 2 (nhanh nhưng hiệu quả)
      if (emptyCells.length < 50) {
        let bestMove = emptyCells[0];
        let bestScore = -Infinity;

        for (const cell of evaluatedMoves.slice(0, Math.min(10, evaluatedMoves.length))) {
          board[cell.cell.row][cell.cell.col] = symbol;
          const score = this.minimaxXO(board, cell.cell.row, cell.cell.col, false, symbol, opponentSymbol, winLength, 2, -Infinity, Infinity);
          board[cell.cell.row][cell.cell.col] = null;

          if (score > bestScore) {
            bestScore = score;
            bestMove = cell.cell;
          }
        }

        return bestMove;
      }

      // Nếu quá nhiều nước đi, chỉ chọn nước đi tốt nhất dựa trên đánh giá
      return evaluatedMoves[0].cell;
    }

    return emptyCells[0];
  }

  /**
   * Kiểm tra thắng với 5 quân liên tiếp (Gomoku)
   */
  checkXOWin(board, row, col, symbol, winLength = 5) {
    const boardSize = board.length;
    const directions = [
      { dr: 0, dc: 1 },   // Horizontal
      { dr: 1, dc: 0 },   // Vertical
      { dr: 1, dc: 1 },   // Main diagonal
      { dr: 1, dc: -1 }   // Anti-diagonal
    ];

    for (const dir of directions) {
      let count = 1; // Đếm quân cờ liên tiếp

      // Đếm theo hướng forward
      let r = row + dir.dr;
      let c = col + dir.dc;
      while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === symbol) {
        count++;
        r += dir.dr;
        c += dir.dc;
      }

      // Đếm theo hướng backward
      r = row - dir.dr;
      c = col - dir.dc;
      while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === symbol) {
        count++;
        r -= dir.dr;
        c -= dir.dc;
      }

      if (count >= winLength) {
        return true;
      }
    }

    return false;
  }

  /**
   * Phân tích các pattern trên bàn cờ
   */
  analyzeXOPatterns(board, emptyCells, symbol, opponentSymbol, winLength) {
    const patterns = {
      myOpenFour: [],      // 4 quân mình, 2 đầu tự do
      oppOpenFour: [],     // 4 quân đối thủ, 2 đầu tự do
      myFourBlocked: [],   // 4 quân mình, 1 đầu tự do
      oppFourBlocked: [],  // 4 quân đối thủ, 1 đầu tự do
      myOpenThree: [],     // 3 quân mình, 2 đầu tự do
      oppOpenThree: []     // 3 quân đối thủ, 2 đầu tự do
    };

    for (const cell of emptyCells) {
      // Kiểm tra pattern cho mình
      const myPattern = this.detectPattern(board, cell.row, cell.col, symbol, opponentSymbol, winLength);
      if (myPattern.openFour) patterns.myOpenFour.push({ cell, priority: myPattern.priority });
      if (myPattern.fourBlocked) patterns.myFourBlocked.push({ cell, priority: myPattern.priority });
      if (myPattern.openThree) patterns.myOpenThree.push({ cell, priority: myPattern.priority });

      // Kiểm tra pattern cho đối thủ
      const oppPattern = this.detectPattern(board, cell.row, cell.col, opponentSymbol, symbol, winLength);
      if (oppPattern.openFour) patterns.oppOpenFour.push({ cell, priority: oppPattern.priority });
      if (oppPattern.fourBlocked) patterns.oppFourBlocked.push({ cell, priority: oppPattern.priority });
      if (oppPattern.openThree) patterns.oppOpenThree.push({ cell, priority: oppPattern.priority });
    }

    // Sắp xếp theo priority
    Object.keys(patterns).forEach(key => {
      patterns[key].sort((a, b) => b.priority - a.priority);
    });

    return patterns;
  }

  /**
   * Phát hiện pattern tại một ô
   */
  detectPattern(board, row, col, symbol, opponentSymbol, winLength) {
    const boardSize = board.length;
    const directions = [
      { dr: 0, dc: 1 },   // Horizontal
      { dr: 1, dc: 0 },   // Vertical
      { dr: 1, dc: 1 },   // Main diagonal
      { dr: 1, dc: -1 }   // Anti-diagonal
    ];

    let openFour = false;
    let fourBlocked = false;
    let openThree = false;
    let maxPriority = 0;

    for (const dir of directions) {
      const pattern = this.checkPatternInDirection(board, row, col, symbol, opponentSymbol, dir.dr, dir.dc, winLength);
      if (pattern.openFour) {
        openFour = true;
        maxPriority = Math.max(maxPriority, 1000);
      } else if (pattern.fourBlocked) {
        fourBlocked = true;
        maxPriority = Math.max(maxPriority, 500);
      } else if (pattern.openThree) {
        openThree = true;
        maxPriority = Math.max(maxPriority, 100);
      }
    }

    return { openFour, fourBlocked, openThree, priority: maxPriority };
  }

  /**
   * Kiểm tra pattern theo một hướng
   */
  checkPatternInDirection(board, row, col, symbol, opponentSymbol, dr, dc, winLength) {
    const boardSize = board.length;
    
    // Đếm quân cờ liên tiếp theo hướng
    let count = 0;
    let leftOpen = false;
    let rightOpen = false;

    // Đếm backward
    let r = row - dr;
    let c = col - dc;
    let leftBlocked = false;
    while (r >= 0 && r < boardSize && c >= 0 && c < boardSize) {
      if (board[r][c] === symbol) {
        count++;
        r -= dr;
        c -= dc;
      } else if (board[r][c] === opponentSymbol) {
        leftBlocked = true;
        break;
      } else {
        leftOpen = true;
        break;
      }
    }
    if (r < 0 || r >= boardSize || c < 0 || c >= boardSize) leftBlocked = true;
    if (!leftBlocked && (r < 0 || r >= boardSize || c < 0 || c >= boardSize)) leftOpen = true;

    // Đếm forward
    r = row + dr;
    c = col + dc;
    let rightBlocked = false;
    while (r >= 0 && r < boardSize && c >= 0 && c < boardSize) {
      if (board[r][c] === symbol) {
        count++;
        r += dr;
        c += dc;
      } else if (board[r][c] === opponentSymbol) {
        rightBlocked = true;
        break;
      } else {
        rightOpen = true;
        break;
      }
    }
    if (r < 0 || r >= boardSize || c < 0 || c >= boardSize) rightBlocked = true;
    if (!rightBlocked && (r < 0 || r >= boardSize || c < 0 || c >= boardSize)) rightOpen = true;

    // Đánh giá pattern
    const openEnds = (leftOpen ? 1 : 0) + (rightOpen ? 1 : 0);

    // 4 quân với 2 đầu tự do (Open Four) - nguy hiểm nhất
    if (count === 4 && openEnds === 2) {
      return { openFour: true };
    }

    // 4 quân với 1 đầu tự do (Four Blocked)
    if (count === 4 && openEnds === 1) {
      return { fourBlocked: true };
    }

    // 3 quân với 2 đầu tự do (Open Three)
    if (count === 3 && openEnds === 2) {
      return { openThree: true };
    }

    return {};
  }

  /**
   * Đánh giá điểm số của một ô
   */
  evaluateXOCell(board, row, col, symbol, opponentSymbol, winLength) {
    let score = 0;
    const boardSize = board.length;

    // Ưu tiên trung tâm
    const center = Math.floor(boardSize / 2);
    const distFromCenter = Math.abs(row - center) + Math.abs(col - center);
    score += (boardSize - distFromCenter) * 2;

    // Đánh giá các hướng
    const directions = [
      { dr: 0, dc: 1 },   // Horizontal
      { dr: 1, dc: 0 },   // Vertical
      { dr: 1, dc: 1 },   // Main diagonal
      { dr: 1, dc: -1 }   // Anti-diagonal
    ];

    for (const dir of directions) {
      const myScore = this.evaluateDirection(board, row, col, symbol, opponentSymbol, dir.dr, dir.dc, winLength);
      const oppScore = this.evaluateDirection(board, row, col, opponentSymbol, symbol, dir.dr, dir.dc, winLength);
      score += myScore * 2; // Ưu tiên tấn công
      score -= oppScore * 1.5; // Phòng thủ cũng quan trọng
    }

    return score;
  }

  /**
   * Đánh giá điểm số theo một hướng
   */
  evaluateDirection(board, row, col, symbol, opponentSymbol, dr, dc, winLength) {
    const boardSize = board.length;
    let score = 0;

    // Giả sử đánh ở ô này
    board[row][col] = symbol;

    // Đếm quân cờ liên tiếp
    let count = 1;
    let leftOpen = false;
    let rightOpen = false;

    // Backward
    let r = row - dr;
    let c = col - dc;
    while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === symbol) {
      count++;
      r -= dr;
      c -= dc;
    }
    if (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === null) {
      leftOpen = true;
    }

    // Forward
    r = row + dr;
    c = col + dc;
    while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === symbol) {
      count++;
      r += dr;
      c += dc;
    }
    if (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === null) {
      rightOpen = true;
    }

    const openEnds = (leftOpen ? 1 : 0) + (rightOpen ? 1 : 0);

    // Tính điểm dựa trên số quân và số đầu tự do
    if (count >= winLength) {
      score += 100000; // Thắng
    } else if (count === 4) {
      score += openEnds === 2 ? 10000 : (openEnds === 1 ? 1000 : 0);
    } else if (count === 3) {
      score += openEnds === 2 ? 1000 : (openEnds === 1 ? 100 : 0);
    } else if (count === 2) {
      score += openEnds === 2 ? 100 : (openEnds === 1 ? 10 : 0);
    } else if (count === 1) {
      score += openEnds === 2 ? 10 : (openEnds === 1 ? 1 : 0);
    }

    // Hoàn nguyên
    board[row][col] = null;

    return score;
  }

  /**
   * Minimax algorithm cho XO (với alpha-beta pruning)
   */
  minimaxXO(board, row, col, isMaximizing, symbol, opponentSymbol, winLength, depth, alpha, beta) {
    // Đánh cờ
    board[row][col] = isMaximizing ? symbol : opponentSymbol;

    // Kiểm tra thắng
    const isWin = this.checkXOWin(board, row, col, isMaximizing ? symbol : opponentSymbol, winLength);
    if (isWin) {
      board[row][col] = null;
      return isMaximizing ? 10000 : -10000;
    }

    // Nếu hết độ sâu, đánh giá vị trí
    if (depth === 0) {
      const score = this.evaluateXOPositionAdvanced(board, symbol, opponentSymbol, winLength);
      board[row][col] = null;
      return isMaximizing ? score : -score;
    }

    // Tìm các nước đi có thể
    const emptyCells = [];
    for (let r = Math.max(0, row - 3); r <= Math.min(board.length - 1, row + 3); r++) {
      for (let c = Math.max(0, col - 3); c <= Math.min(board.length - 1, col + 3); c++) {
        if (board[r][c] === null) {
          emptyCells.push({ row: r, col: c });
        }
      }
    }

    if (emptyCells.length === 0) {
      board[row][col] = null;
      return 0; // Hòa
    }

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const cell of emptyCells) {
        const score = this.minimaxXO(board, cell.row, cell.col, false, symbol, opponentSymbol, winLength, depth - 1, alpha, beta);
        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      board[row][col] = null;
      return maxScore;
    } else {
      let minScore = Infinity;
      for (const cell of emptyCells) {
        const score = this.minimaxXO(board, cell.row, cell.col, true, symbol, opponentSymbol, winLength, depth - 1, alpha, beta);
        minScore = Math.min(minScore, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      board[row][col] = null;
      return minScore;
    }
  }

  /**
   * Đánh giá vị trí nâng cao cho Minimax
   */
  evaluateXOPositionAdvanced(board, symbol, opponentSymbol, winLength) {
    let score = 0;
    const boardSize = board.length;

    // Đánh giá từng ô
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (board[row][col] === null) {
          const myScore = this.evaluateXOCell(board, row, col, symbol, opponentSymbol, winLength);
          score += myScore;
        }
      }
    }

    return score;
  }

  /**
   * Bot cho game Tiến Lên
   * Trả về action: 'play-cards' hoặc 'pass', và cardIndices nếu play
   */
  getTienLenMove(hand, lastPlay, canPass, gameInstance) {
    if (!hand || hand.length === 0) {
      return { action: 'pass' };
    }

    // Nếu không có lượt đánh trước, bot đánh bài thấp nhất
    if (!lastPlay || lastPlay.length === 0) {
      // EASY: Đánh ngẫu nhiên hoặc bài thấp
      if (this.difficulty === 'easy') {
        if (Math.random() > 0.5) {
          // 50% đánh bài thấp nhất
          const lowestCardIndex = hand.length - 1;
          return { action: 'play-cards', cardIndices: [lowestCardIndex] };
        } else {
          // 50% đánh ngẫu nhiên
          const randomIndex = Math.floor(Math.random() * hand.length);
          return { action: 'play-cards', cardIndices: [randomIndex] };
        }
      }

      // MEDIUM và HARD: Đánh bài thấp nhất, nhưng ưu tiên đánh đôi/ba nếu có thể
      // Tìm các tổ hợp có thể đánh
      const allPossiblePlays = [];
      for (let count = 1; count <= Math.min(3, hand.length); count++) {
        const combos = this.generateCombinationsTienLen(hand, count);
        for (const combo of combos) {
          if (gameInstance.isValidCombination(combo.cards)) {
            allPossiblePlays.push(combo);
          }
        }
      }

      if (allPossiblePlays.length > 0) {
        // Ưu tiên đánh tổ hợp nhỏ nhất (để giữ bài lớn)
        allPossiblePlays.sort((a, b) => {
          const avgA = a.cards.reduce((sum, c) => sum + c.value, 0) / a.cards.length;
          const avgB = b.cards.reduce((sum, c) => sum + c.value, 0) / b.cards.length;
          return avgA - avgB;
        });

        if (this.difficulty === 'medium' && Math.random() > 0.7) {
          // Medium: 30% đánh ngẫu nhiên trong top 3
          const top3 = allPossiblePlays.slice(0, Math.min(3, allPossiblePlays.length));
          const selected = top3[Math.floor(Math.random() * top3.length)];
          return { action: 'play-cards', cardIndices: selected.indices };
        }

        return { action: 'play-cards', cardIndices: allPossiblePlays[0].indices };
      }

      // Fallback: đánh bài thấp nhất
      const lowestCardIndex = hand.length - 1;
      return { action: 'play-cards', cardIndices: [lowestCardIndex] };
    }

    // Có lượt đánh trước, bot cần tìm bài để đánh
    const validPlays = this.findValidPlaysTienLen(hand, lastPlay, gameInstance);
    
    if (validPlays.length === 0) {
      // Không có bài hợp lệ, bỏ lượt nếu được phép
      if (canPass) {
        return { action: 'pass' };
      }
      // Không thể bỏ lượt, đánh bài thấp nhất có thể
      return { action: 'play-cards', cardIndices: [hand.length - 1] };
    }

    // EASY: Chọn ngẫu nhiên trong các nước đi hợp lệ
    if (this.difficulty === 'easy') {
      const randomPlay = validPlays[Math.floor(Math.random() * validPlays.length)];
      return { action: 'play-cards', cardIndices: randomPlay.indices };
    }

    // MEDIUM và HARD: Đánh giá và chọn bài tốt nhất
    const evaluatedPlays = validPlays.map(play => {
      let score = 0;
      const cards = play.cards;
      const cardCount = cards.length;
      
      // 1. Ưu tiên đánh nhiều bài hơn (để đỡ tốn bài)
      score += cardCount * 5;
      
      // 2. Ưu tiên đánh bài thấp (giữ bài cao để sau)
      const avgValue = cards.reduce((sum, card) => sum + card.value, 0) / cardCount;
      score -= avgValue * 2;
      
      // 3. MEDIUM: Có một chút ngẫu nhiên
      if (this.difficulty === 'medium') {
        score += Math.random() * 10;
      }

      return { play, score };
    });

    // Sort theo điểm số (cao nhất trước)
    evaluatedPlays.sort((a, b) => b.score - a.score);

    return { action: 'play-cards', cardIndices: evaluatedPlays[0].play.indices };
  }

  /**
   * Tìm tất cả các cách đánh hợp lệ từ hand để đánh lại lastPlay
   */
  findValidPlaysTienLen(hand, lastPlay, gameInstance) {
    const validPlays = [];
    
    // Generate tất cả các tổ hợp có thể
    const maxCards = lastPlay.length;
    
    // Thử từ 1 đến maxCards lá
    for (let count = 1; count <= maxCards && count <= hand.length; count++) {
      const combinations = this.generateCombinationsTienLen(hand, count);
      
      for (const combo of combinations) {
        if (gameInstance.isValidPlay(combo.cards, lastPlay)) {
          validPlays.push(combo);
        }
      }
    }

    return validPlays;
  }

  /**
   * Generate tất cả các tổ hợp từ hand với số lượng cards cho trước
   */
  generateCombinationsTienLen(hand, count) {
    const combinations = [];
    
    if (count === 0) return combinations;
    
    const generate = (start, current) => {
      if (current.cards.length === count) {
        combinations.push({
          indices: [...current.indices],
          cards: [...current.cards]
        });
        return;
      }
      
      for (let i = start; i < hand.length; i++) {
        generate(i + 1, {
          indices: [...current.indices, i],
          cards: [...current.cards, hand[i]]
        });
      }
    };
    
    generate(0, { indices: [], cards: [] });
    return combinations;
  }

  /**
   * Bot cho game Tài Xỉu - chọn đặt cược
   */
  getTaiXiuBet(difficulty = this.difficulty) {
    // EASY: Đặt ngẫu nhiên
    if (difficulty === 'easy') {
      return {
        choice: Math.random() > 0.5 ? 'tai' : 'xiu',
        amount: Math.floor(Math.random() * 5) + 1
      };
    }

    // MEDIUM: Có chiến lược một chút
    if (difficulty === 'medium') {
      return {
        choice: Math.random() > 0.6 ? 'tai' : 'xiu',
        amount: Math.floor(Math.random() * 3) + 2
      };
    }

    // HARD: Chiến lược phức tạp hơn (có thể phân tích lịch sử)
    if (difficulty === 'hard') {
      return {
        choice: Math.random() > 0.55 ? 'tai' : 'xiu',
        amount: Math.floor(Math.random() * 4) + 3
      };
    }

    return { choice: 'tai', amount: 1 };
  }

  /**
   * Bot cho game Sâm Lốc
   * Tương tự Tiến Lên, sử dụng chung logic
   */
  getSamLocMove(hand, lastPlay, canPass, gameInstance) {
    // Sử dụng logic tương tự Tiến Lên vì cách chơi giống nhau
    return this.getTienLenMove(hand, lastPlay, canPass, gameInstance);
  }

  /**
   * Bot cho game Cờ Vua
   * Chọn một nước đi hợp lệ từ validMoves với đánh giá thông minh
   */
  getCoVuaMove(gameState) {
    const validMoves = gameState.validMoves || [];
    const board = gameState.board || [];
    
    if (validMoves.length === 0) {
      return null; // Không có nước đi hợp lệ
    }

    // Giá trị quân cờ
    const pieceValues = {
      'P': 1, 'p': 1,   // Tốt
      'N': 3, 'n': 3,   // Mã
      'B': 3, 'b': 3,   // Tượng
      'R': 5, 'r': 5,   // Xe
      'Q': 9, 'q': 9,   // Hậu
      'K': 100, 'k': 100 // Vua
    };

    // EASY: Chọn ngẫu nhiên với một chút logic cơ bản
    if (this.difficulty === 'easy') {
      // Ưu tiên các nước đi ăn quân
      const captureMoves = validMoves.filter(move => {
        const targetPiece = board[move.toRow] && board[move.toRow][move.toCol];
        return targetPiece && targetPiece !== 0;
      });

      if (captureMoves.length > 0 && Math.random() > 0.3) {
        const randomCapture = captureMoves[Math.floor(Math.random() * captureMoves.length)];
        return {
          fromRow: randomCapture.fromRow,
          fromCol: randomCapture.fromCol,
          toRow: randomCapture.toRow,
          toCol: randomCapture.toCol,
          promotion: 'Q'
        };
      }

      const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
      return {
        fromRow: randomMove.fromRow,
        fromCol: randomMove.fromCol,
        toRow: randomMove.toRow,
        toCol: randomMove.toCol,
        promotion: 'Q'
      };
    }

    // Đánh giá các nước đi
    const evaluatedMoves = validMoves.map(move => {
      let score = 0;
      const fromPiece = board[move.fromRow] && board[move.fromRow][move.fromCol];
      const toPiece = board[move.toRow] && board[move.toRow][move.toCol];
      
      // 1. Ưu tiên ăn quân (capture)
      if (toPiece && toPiece !== 0) {
        const capturedValue = pieceValues[toPiece] || 0;
        const attackerValue = pieceValues[fromPiece] || 1;
        score += capturedValue * 10 - attackerValue; // Ăn quân giá trị cao hơn quân mình
      }

      // 2. Kiểm soát trung tâm (center control)
      const centerSquares = [[3, 3], [3, 4], [4, 3], [4, 4]];
      if (centerSquares.some(([r, c]) => move.toRow === r && move.toCol === c)) {
        score += 2;
      }

      // 3. Phát triển quân (development) - ưu tiên di chuyển quân ở hàng đầu
      if (move.fromRow === (gameState.myColor === 'white' ? 7 : 0)) {
        if (fromPiece && (fromPiece.toUpperCase() === 'N' || fromPiece.toUpperCase() === 'B')) {
          score += 1;
        }
      }

      // 4. An toàn vua - ưu tiên nhập thành (castling)
      if (fromPiece && fromPiece.toUpperCase() === 'K' && Math.abs(move.toCol - move.fromCol) === 2) {
        score += 5;
      }

      // 5. Tránh để quân bị tấn công (với medium và hard)
      // Đơn giản hóa: ưu tiên nước đi không bị tấn công ngay

      return { move, score };
    });

    // MEDIUM: Chọn nước đi tốt hơn, có một chút ngẫu nhiên
    if (this.difficulty === 'medium') {
      // Sắp xếp theo điểm số
      evaluatedMoves.sort((a, b) => b.score - a.score);
      
      // Chọn trong top 3 nước đi tốt nhất
      const topMoves = evaluatedMoves.slice(0, Math.min(3, evaluatedMoves.length));
      const selected = topMoves[Math.floor(Math.random() * topMoves.length)];
      
      return {
        fromRow: selected.move.fromRow,
        fromCol: selected.move.fromCol,
        toRow: selected.move.toRow,
        toCol: selected.move.toCol,
        promotion: 'Q'
      };
    }

    // HARD: Chọn nước đi tốt nhất
    evaluatedMoves.sort((a, b) => b.score - a.score);
    const bestMove = evaluatedMoves[0].move;
    
    return {
      fromRow: bestMove.fromRow,
      fromCol: bestMove.fromCol,
      toRow: bestMove.toRow,
      toCol: bestMove.toCol,
      promotion: 'Q'
    };
  }
}

module.exports = BotAI;

