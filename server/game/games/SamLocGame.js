class SamLocGame {
  constructor(players) {
    this.players = players;
    this.currentPlayerIndex = 0;
    this.deck = this.createDeck();
    this.hands = {};
    this.lastPlay = null;
    this.lastPlayerId = null;
    this.passes = 0;
    this.gamePhase = 'playing';
    this.lastPassedPlayerId = null; // Người vừa bỏ lượt
    this.passChain = []; // Danh sách người đã bỏ lượt liên tiếp trong chuỗi hiện tại
    
    this.dealCards();
  }

  createDeck() {
    const suits = ['spades', 'clubs', 'diamonds', 'hearts']; // Bích, Tép, Rô, Cơ
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
    // Thứ tự ưu tiên: Hearts (Cơ - mạnh nhất) > Diamonds (Rô) > Clubs (Tép) > Spades (Bích - yếu nhất)
    const suitValues = { 
      'hearts': 0.4,      // Cơ - mạnh nhất
      'diamonds': 0.3,    // Rô
      'clubs': 0.2,       // Tép
      'spades': 0.1       // Bích - yếu nhất
    };
    return baseValue + suitValues[suit];
  }

  dealCards() {
    // Mỗi người chơi được chia 10 lá bài trong Sâm lốc
    const cardsPerPlayer = 10;
    this.players.forEach((player, index) => {
      this.hands[player.id] = this.deck.slice(index * cardsPerPlayer, (index + 1) * cardsPerPlayer)
        .sort((a, b) => b.value - a.value); // Sắp xếp từ lớn đến nhỏ
    });

    // Số bài còn lại không được chia
    this.remainingCards = this.deck.slice(this.players.length * cardsPerPlayer);
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
      return { success: false, error: 'Tổ hợp bài không hợp lệ hoặc không thể chặt được' };
    }

    // Remove cards from hand
    cardIndices.sort((a, b) => b - a);
    cardIndices.forEach(idx => hand.splice(idx, 1));

    this.lastPlay = cards;
    this.lastPlayerId = playerId;
    this.passes = 0;
    this.lastPassedPlayerId = null; // Reset khi có người đánh
    this.passChain = []; // Reset chuỗi bỏ lượt (khi đánh bài, reset hết)

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
    
    // Check for pairs, triples, four of a kind
    const ranks = cards.map(c => c.rank);
    const uniqueRanks = new Set(ranks);
    
    if (cards.length === 2 && uniqueRanks.size === 1) return true; // Đôi
    if (cards.length === 3 && uniqueRanks.size === 1) return true; // Ba
    if (cards.length === 4 && uniqueRanks.size === 1) return true; // Tứ quý
    
    // Check for straight (sảnh) - từ 3 lá trở lên
    if (cards.length >= 3 && this.isStraight(cards)) return true;
    
    return false;
  }

  isStraight(cards) {
    // Sảnh phải cùng chất và liên tiếp
    if (cards.length < 3) return false;
    
    const suits = cards.map(c => c.suit);
    const uniqueSuits = new Set(suits);
    if (uniqueSuits.size !== 1) return false; // Phải cùng chất
    
    // Lấy giá trị cơ bản (không tính chất)
    const values = cards.map(c => Math.floor(c.value)).sort((a, b) => a - b);
    
    // Kiểm tra liên tiếp
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== values[i-1] + 1) return false;
    }
    
    // Không được có lá 2 trong sảnh
    if (values.includes(15)) return false;
    
    return true;
  }

  getPlayType(cards) {
    if (cards.length === 1) return 'single';
    if (cards.length === 2) return 'pair';
    if (cards.length === 3) return 'triple';
    if (cards.length === 4) {
      const ranks = cards.map(c => c.rank);
      const uniqueRanks = new Set(ranks);
      return uniqueRanks.size === 1 ? 'four' : 'straight';
    }
    if (cards.length >= 3) {
      return this.isStraight(cards) ? 'straight' : null;
    }
    return null;
  }

  canBeat(cards, lastPlay) {
    const playType = this.getPlayType(cards);
    const lastPlayType = this.getPlayType(lastPlay);
    
    // Phải cùng loại tổ hợp
    if (playType !== lastPlayType) {
      // Tứ quý có thể chặt bất kỳ tổ hợp nào
      if (playType === 'four') return true;
      return false;
    }
    
    // Tứ quý không thể bị chặt bằng tổ hợp khác (trừ tứ quý lớn hơn)
    if (lastPlayType === 'four' && playType !== 'four') return false;
    
    // So sánh giá trị
    if (playType === 'single' || playType === 'pair' || playType === 'triple') {
      const maxCard = Math.max(...cards.map(c => c.value));
      const lastMaxCard = Math.max(...lastPlay.map(c => c.value));
      return maxCard > lastMaxCard;
    }
    
    // So sánh sảnh
    if (playType === 'straight') {
      if (cards.length !== lastPlay.length) return false;
      const maxCard = Math.max(...cards.map(c => c.value));
      const lastMaxCard = Math.max(...lastPlay.map(c => c.value));
      return maxCard > lastMaxCard;
    }
    
    // So sánh tứ quý
    if (playType === 'four') {
      const cardValue = Math.floor(cards[0].value);
      const lastValue = Math.floor(lastPlay[0].value);
      return cardValue > lastValue;
    }
    
    return false;
  }
}

module.exports = SamLocGame;
