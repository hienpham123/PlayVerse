class TienLenGame {
  constructor(players) {
    this.players = players;
    this.currentPlayerIndex = 0;
    this.deck = this.createDeck();
    this.hands = {};
    this.lastPlay = null;
    this.lastPlayerId = null;
    this.passes = 0;
    
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
    this.passes++;
    
    // If all players pass, reset last play
    if (this.passes >= this.players.length - 1) {
      this.lastPlay = null;
      this.lastPlayerId = null;
      this.passes = 0;
    }

    this.nextTurn();
    return { success: true, data: { passed: true } };
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
    if (cards.length === 4 && uniqueRanks.size === 1) return true; // Four of a kind
    
    // Check for straight (simplified)
    if (cards.length >= 3 && this.isStraight(cards)) return true;
    
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
    if (cards.length !== lastPlay.length) return false;
    
    const maxCard = Math.max(...cards.map(c => c.value));
    const lastMaxCard = Math.max(...lastPlay.map(c => c.value));
    
    return maxCard > lastMaxCard;
  }
}

module.exports = TienLenGame;

