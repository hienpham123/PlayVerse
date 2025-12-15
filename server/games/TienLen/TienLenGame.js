class TienLenGame {
  constructor(players) {
    this.players = players;
    this.currentPlayerIndex = 0;
    this.deck = this.createDeck();
    this.hands = {};
    this.lastPlay = null;
    this.lastPlayerId = null;
    this.passes = 0;
    this.lastPassedPlayerId = null; // Người vừa bỏ lượt
    this.passChain = []; // Danh sách người đã bỏ lượt liên tiếp trong chuỗi hiện tại
    
    this.dealCards();
  }

  createDeck() {
    const suits = ['spades', 'clubs', 'diamonds', 'hearts'];
    const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
    const deck = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank, value: this.getCardValue(rank, suit) });
      }
    }

    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
  }

  getCardValue(rank, suit) {
    const rankValues = {
      '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15
    };
    
    const baseValue = rankValues[rank] || 0;
    // Thứ tự ưu tiên: Hearts (mạnh nhất) > Diamonds > Clubs > Spades (yếu nhất)
    const suitValues = { 
      'hearts': 0.4,      // Cơ - mạnh nhất
      'diamonds': 0.3,    // Rô
      'clubs': 0.2,       // Tép
      'spades': 0.1       // Bích - yếu nhất
    };
    return baseValue + suitValues[suit];
  }

  dealCards() {
    // Deal 13 cards to each player
    this.players.forEach((player, index) => {
      this.hands[player.id] = this.deck.slice(index * 13, (index + 1) * 13)
        .sort((a, b) => b.value - a.value);
    });
  }

  getStateForPlayer(playerId) {
    return {
      currentPlayerId: this.players[this.currentPlayerIndex].id,
      myHand: this.hands[playerId] || [],
      lastPlay: this.lastPlay,
      lastPlayerId: this.lastPlayerId,
      playerCounts: this.players.map(p => ({
        id: p.id,
        username: p.username,
        cardCount: this.hands[p.id]?.length || 0
      }))
    };
  }

  handleAction(playerId, action, data) {
    if (this.players[this.currentPlayerIndex].id !== playerId) {
      return { success: false, error: 'Chưa đến lượt bạn' };
    }

    switch (action) {
      case 'play-cards':
        return this.playCards(playerId, data.cards);
      case 'pass':
        return this.pass(playerId);
      default:
        return { success: false, error: 'Hành động không hợp lệ' };
    }
  }

  playCards(playerId, cardIndices) {
    const hand = this.hands[playerId];
    if (!hand) {
      return { success: false, error: 'Không tìm thấy người chơi' };
    }

    const cards = cardIndices.map(idx => hand[idx]).filter(Boolean);
    if (cards.length === 0) {
      return { success: false, error: 'Chưa chọn bài' };
    }

    // Validate play
    if (!this.isValidPlay(cards, this.lastPlay)) {
      return { success: false, error: 'Tổ hợp bài không hợp lệ' };
    }

    // Remove cards from hand
    cardIndices.sort((a, b) => b - a);
    cardIndices.forEach(idx => hand.splice(idx, 1));

    this.lastPlay = cards;
    this.lastPlayerId = playerId;
    this.passes = 0;
    this.lastPassedPlayerId = null; // Reset khi có người đánh
    this.passChain = []; // Reset chuỗi bỏ lượt

    // Check win condition
    if (hand.length === 0) {
      return { 
        success: true, 
        data: { 
          winner: playerId,
          gameOver: true 
        } 
      };
    }

    this.nextTurn();
    return { success: true, data: { cardsPlayed: cards } };
  }

  pass(playerId) {
    // Kiểm tra xem có được phép bỏ lượt không
    if (!this.canPass(playerId)) {
      return { success: false, error: 'Bạn không thể bỏ lượt ở lượt này' };
    }

    // Thêm người chơi vào chuỗi bỏ lượt
    this.passes++;
    this.lastPassedPlayerId = playerId;
    if (!this.passChain) {
      this.passChain = [];
    }
    this.passChain.push(playerId);
    
    // Kiểm tra và reset nếu cần
    this.checkAndResetPassChain();

    this.nextTurn();
    return { success: true, data: { passed: true } };
  }

  checkAndResetPassChain() {
    const numPlayers = this.players.length;
    
    // Nếu có lượt đánh trước (lastPlay) và tất cả người chơi khác (trừ người đánh lastPlay) đều đã bỏ lượt
    // => Reset lastPlay để người đánh cuối có thể đánh lại bất kỳ lá nào, nhưng GIỮ passChain để kiểm tra canPass
    if (this.lastPlay && this.lastPlayerId) {
      // Lấy danh sách tất cả người chơi trừ người đánh lastPlay
      const otherPlayers = this.players.filter(p => p.id !== this.lastPlayerId);
      
      // Kiểm tra xem tất cả người chơi khác đã bỏ lượt chưa
      if (otherPlayers.length > 0) {
        const allOthersPassed = otherPlayers.every(p => this.passChain && this.passChain.includes(p.id));
        
        if (allOthersPassed) {
          // Tất cả người khác đã bỏ lượt, reset lastPlay nhưng GIỮ passChain
          // passChain sẽ được reset khi người đánh cuối thực sự đánh bài (trong playCards)
          this.lastPlay = null;
          this.lastPlayerId = null;
          this.passes = 0;
          this.lastPassedPlayerId = null;
          // KHÔNG xóa passChain ở đây, để canPass có thể kiểm tra
          return;
        }
      }
    }
    
    // Nếu không có lượt đánh trước và tất cả đều bỏ lượt, reset để bắt đầu vòng mới
    if (!this.lastPlay) {
      const playersNotPassed = numPlayers - (this.passChain ? this.passChain.length : 0);
      if (playersNotPassed === 0) {
        this.passes = 0;
        this.lastPassedPlayerId = null;
        this.passChain = [];
      }
    }
  }

  canPass(playerId) {
    const numPlayers = this.players.length;
    
    // Với 2 người chơi: áp dụng quy tắc đặc biệt
    if (numPlayers === 2) {
      // Nếu đã có người bỏ lượt trong chuỗi hiện tại, người tiếp theo PHẢI đánh
      // (không phân biệt có lastPlay hay không)
      if (this.passChain && this.passChain.length > 0) {
        return false;
      }
      // Chưa có ai bỏ lượt, có thể bỏ
      return true;
    }
    
    // Với 3-4 người chơi:
    if (numPlayers >= 3) {
      // Nếu không có lượt đánh trước, cho phép bỏ lượt tự do
      if (!this.lastPlay) {
        return true;
      }
      
      // Nếu CÓ lượt đánh trước, áp dụng quy tắc:
      // Đếm số người chưa bỏ lượt
      const playersNotPassed = numPlayers - (this.passChain ? this.passChain.length : 0);
      
      // Nếu chỉ còn 1 người chưa bỏ lượt, người đó PHẢI đánh (không được bỏ)
      if (playersNotPassed === 1) {
        return false;
      }
      
      // Còn nhiều hơn 1 người chưa bỏ lượt, có thể bỏ
      return true;
    }
    
    return true;
  }

  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
  }

  isValidPlay(cards, lastPlay) {
    // If no last play, any valid combination is allowed
    if (!lastPlay) {
      return this.isValidCombination(cards);
    }

    // Must be same type and higher
    if (!this.isValidCombination(cards)) {
      return false;
    }

    return this.canBeat(cards, lastPlay);
  }

  isValidCombination(cards) {
    if (cards.length === 0) return false;
    if (cards.length === 1) return true; // Single card
    
    // Check for pairs, triples, etc.
    const ranks = cards.map(c => c.rank);
    const uniqueRanks = new Set(ranks);
    
    if (cards.length === 2 && uniqueRanks.size === 1) return true; // Pair
    if (cards.length === 3 && uniqueRanks.size === 1) return true; // Triple
    if (cards.length === 4 && uniqueRanks.size === 1) return true; // Four of a kind (Tứ quý)
    
    // Check for straight (simplified)
    if (cards.length >= 3 && this.isStraight(cards)) return true;
    
    // Check for 3 đôi thông (3 pairs in sequence)
    if (cards.length === 6 && this.isThreePairStraight(cards)) return true;
    
    // Check for 4 đôi thông (4 pairs in sequence)
    if (cards.length === 8 && this.isFourPairStraight(cards)) return true;
    
    return false;
  }

  isStraight(cards) {
    const values = cards.map(c => Math.floor(c.value)).sort((a, b) => a - b);
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== values[i-1] + 1) return false;
    }
    return true;
  }

  canBeat(cards, lastPlay) {
    // === QUY TẮC CHẶT ĐẶC BIỆT ===
    
    // 1. Tứ quý chặt được: 1 lá 2, đôi 2, 3 đôi thông, tứ quý nhỏ hơn
    if (this.isFourOfAKind(cards)) {
      if (this.isSingleTwo(lastPlay)) return true;
      if (this.isPairTwo(lastPlay)) return true;
      if (this.isThreePairStraight(lastPlay)) return true;
      if (this.isFourOfAKind(lastPlay)) {
        // So sánh tứ quý
        return Math.floor(cards[0].value) > Math.floor(lastPlay[0].value);
      }
    }
    
    // 2. 4 đôi thông chặt được: 1 lá 2, đôi 2, 3 đôi thông, tứ quý, 4 đôi thông nhỏ hơn
    if (this.isFourPairStraight(cards)) {
      if (this.isSingleTwo(lastPlay)) return true;
      if (this.isPairTwo(lastPlay)) return true;
      if (this.isThreePairStraight(lastPlay)) return true;
      if (this.isFourOfAKind(lastPlay)) return true;
      if (this.isFourPairStraight(lastPlay)) {
        // So sánh 4 đôi thông (so sánh đôi lớn nhất)
        return this.comparePairStraight(cards, lastPlay) > 0;
      }
    }
    
    // 3. 3 đôi thông chặt được: 1 lá 2, đôi 2, 3 đôi thông nhỏ hơn
    if (this.isThreePairStraight(cards)) {
      if (this.isSingleTwo(lastPlay)) return true;
      if (this.isPairTwo(lastPlay)) return true;
      if (this.isThreePairStraight(lastPlay)) {
        // So sánh 3 đôi thông (so sánh đôi lớn nhất)
        return this.comparePairStraight(cards, lastPlay) > 0;
      }
    }
    
    // === QUY TẮC BÌNH THƯỜNG ===
    // Phải cùng loại tổ hợp và cùng số lượng lá
    if (cards.length !== lastPlay.length) return false;
    
    // So sánh giá trị
    const maxCard = Math.max(...cards.map(c => c.value));
    const lastMaxCard = Math.max(...lastPlay.map(c => c.value));
    
    return maxCard > lastMaxCard;
  }

  // Kiểm tra xem có phải 3 đôi thông không (6 lá bài, 3 đôi liên tiếp)
  isThreePairStraight(cards) {
    if (cards.length !== 6) return false;
    
    // Đếm số lượng mỗi rank
    const rankCount = {};
    cards.forEach(card => {
      rankCount[card.rank] = (rankCount[card.rank] || 0) + 1;
    });
    
    // Kiểm tra xem có đúng 3 rank, mỗi rank có đúng 2 lá không
    const ranks = Object.keys(rankCount);
    if (ranks.length !== 3) return false;
    
    // Kiểm tra mỗi rank có đúng 2 lá
    for (const rank of ranks) {
      if (rankCount[rank] !== 2) return false;
    }
    
    // Kiểm tra 3 rank có liên tiếp không (không tính 2)
    // Sắp xếp các rank theo giá trị (bỏ qua 2)
    const rankOrder = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const sortedRanks = ranks
      .filter(r => r !== '2') // Bỏ qua 2
      .sort((a, b) => rankOrder.indexOf(a) - rankOrder.indexOf(b));
    
    // Phải có đúng 3 rank và không có rank là '2'
    if (sortedRanks.length !== 3) return false;
    
    // Kiểm tra 3 rank liên tiếp
    for (let i = 1; i < sortedRanks.length; i++) {
      const prevIndex = rankOrder.indexOf(sortedRanks[i - 1]);
      const currIndex = rankOrder.indexOf(sortedRanks[i]);
      if (currIndex !== prevIndex + 1) return false;
    }
    
    return true;
  }

  // Kiểm tra xem có phải đôi 2 không (2 lá bài có rank là '2')
  isPairTwo(cards) {
    if (cards.length !== 2) return false;
    return cards[0].rank === '2' && cards[1].rank === '2';
  }

  // Kiểm tra xem có phải 1 lá 2 không
  isSingleTwo(cards) {
    if (cards.length !== 1) return false;
    return cards[0].rank === '2';
  }

  // Kiểm tra xem có phải tứ quý không (4 lá cùng rank)
  isFourOfAKind(cards) {
    if (cards.length !== 4) return false;
    const ranks = cards.map(c => c.rank);
    const uniqueRanks = new Set(ranks);
    return uniqueRanks.size === 1;
  }

  // Kiểm tra xem có phải 4 đôi thông không (8 lá bài, 4 đôi liên tiếp)
  isFourPairStraight(cards) {
    if (cards.length !== 8) return false;
    
    // Đếm số lượng mỗi rank
    const rankCount = {};
    cards.forEach(card => {
      rankCount[card.rank] = (rankCount[card.rank] || 0) + 1;
    });
    
    // Kiểm tra xem có đúng 4 rank, mỗi rank có đúng 2 lá không
    const ranks = Object.keys(rankCount);
    if (ranks.length !== 4) return false;
    
    // Kiểm tra mỗi rank có đúng 2 lá
    for (const rank of ranks) {
      if (rankCount[rank] !== 2) return false;
    }
    
    // Kiểm tra 4 rank có liên tiếp không (không tính 2)
    const rankOrder = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const sortedRanks = ranks
      .filter(r => r !== '2') // Bỏ qua 2
      .sort((a, b) => rankOrder.indexOf(a) - rankOrder.indexOf(b));
    
    // Phải có đúng 4 rank và không có rank là '2'
    if (sortedRanks.length !== 4) return false;
    
    // Kiểm tra 4 rank liên tiếp
    for (let i = 1; i < sortedRanks.length; i++) {
      const prevIndex = rankOrder.indexOf(sortedRanks[i - 1]);
      const currIndex = rankOrder.indexOf(sortedRanks[i]);
      if (currIndex !== prevIndex + 1) return false;
    }
    
    return true;
  }

  // So sánh đôi thông (3 hoặc 4 đôi thông) - trả về giá trị của đôi lớn nhất
  comparePairStraight(cards1, cards2) {
    const getMaxPairValue = (cards) => {
      const rankCount = {};
      cards.forEach(card => {
        rankCount[card.rank] = (rankCount[card.rank] || 0) + 1;
      });
      
      const rankOrder = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
      const ranks = Object.keys(rankCount)
        .filter(r => r !== '2')
        .sort((a, b) => rankOrder.indexOf(a) - rankOrder.indexOf(b));
      
      // Lấy rank lớn nhất và tìm giá trị cao nhất của đôi đó
      if (ranks.length === 0) return 0;
      const maxRank = ranks[ranks.length - 1];
      const maxPairCards = cards.filter(c => c.rank === maxRank);
      return Math.max(...maxPairCards.map(c => c.value));
    };
    
    const max1 = getMaxPairValue(cards1);
    const max2 = getMaxPairValue(cards2);
    
    return max1 - max2;
  }
}

module.exports = TienLenGame;

