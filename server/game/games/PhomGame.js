class PhomGame {
  constructor(players) {
    this.players = players;
    this.currentPlayerIndex = 0;
    this.deck = this.createDeck();
    this.hands = {};
    this.discardPile = [];
    this.gamePhase = 'dealing'; // dealing, playing, finished
    
    this.dealCards();
  }

  createDeck() {
    const suits = ['spades', 'clubs', 'diamonds', 'hearts'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank, value: this.getCardValue(rank) });
      }
    }

    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
  }

  getCardValue(rank) {
    const values = {
      'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
      '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
    };
    return values[rank] || 0;
  }

  dealCards() {
    // Deal 9 cards to each player
    let cardIndex = 0;
    this.players.forEach((player) => {
      this.hands[player.id] = this.deck.slice(cardIndex, cardIndex + 9)
        .sort((a, b) => {
          if (a.value !== b.value) return a.value - b.value;
          return a.suit.localeCompare(b.suit);
        });
      cardIndex += 9;
    });

    // Remaining cards become draw pile
    this.drawPile = this.deck.slice(cardIndex);
    this.gamePhase = 'playing';
  }

  getStateForPlayer(playerId) {
    return {
      currentPlayerId: this.players[this.currentPlayerIndex].id,
      myHand: this.hands[playerId] || [],
      discardPile: this.discardPile.slice(-1), // Show only top card
      drawPileCount: this.drawPile.length,
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
      case 'draw-card':
        return this.drawCard(playerId, data.fromDiscard);
      case 'discard-card':
        return this.discardCard(playerId, data.cardIndex);
      case 'form-phom':
        return this.formPhom(playerId, data.cards);
      case 'win':
        return this.checkWin(playerId);
      default:
        return { success: false, error: 'Hành động không hợp lệ' };
    }
  }

  drawCard(playerId, fromDiscard = false) {
    const hand = this.hands[playerId];
    if (!hand) {
      return { success: false, error: 'Không tìm thấy người chơi' };
    }

    let card;
    if (fromDiscard && this.discardPile.length > 0) {
      card = this.discardPile.pop();
    } else if (this.drawPile.length > 0) {
      card = this.drawPile.pop();
    } else {
      return { success: false, error: 'Không còn bài để rút' };
    }

    hand.push(card);
    hand.sort((a, b) => {
      if (a.value !== b.value) return a.value - b.value;
      return a.suit.localeCompare(b.suit);
    });

    return { success: true, data: { cardDrawn: card } };
  }

  discardCard(playerId, cardIndex) {
    const hand = this.hands[playerId];
    if (!hand || cardIndex < 0 || cardIndex >= hand.length) {
      return { success: false, error: 'Lá bài không hợp lệ' };
    }

    const card = hand.splice(cardIndex, 1)[0];
    this.discardPile.push(card);

    this.nextTurn();
    return { success: true, data: { cardDiscarded: card } };
  }

  formPhom(playerId, cardIndices) {
    const hand = this.hands[playerId];
    if (!hand) {
      return { success: false, error: 'Không tìm thấy người chơi' };
    }

    const cards = cardIndices.map(idx => hand[idx]).filter(Boolean);
    if (cards.length < 3) {
      return { success: false, error: 'Phỏm phải có ít nhất 3 lá bài' };
    }

    if (!this.isValidPhom(cards)) {
      return { success: false, error: 'Tổ hợp phỏm không hợp lệ' };
    }

    // Remove cards from hand (in phom, cards are set aside)
    cardIndices.sort((a, b) => b - a);
    cardIndices.forEach(idx => hand.splice(idx, 1));

    // Store phom (simplified - in real game, phoms are tracked separately)
    if (!this.hands[playerId].phoms) {
      this.hands[playerId].phoms = [];
    }
    this.hands[playerId].phoms.push(cards);

    return { success: true, data: { phom: cards } };
  }

  isValidPhom(cards) {
    if (cards.length < 3) return false;

    // Check for same rank (phom đồng chất)
    const ranks = cards.map(c => c.rank);
    const uniqueRanks = new Set(ranks);
    if (uniqueRanks.size === 1) return true;

    // Check for straight same suit (phom sảnh)
    const sorted = [...cards].sort((a, b) => a.value - b.value);
    const suits = sorted.map(c => c.suit);
    const uniqueSuits = new Set(suits);
    if (uniqueSuits.size !== 1) return false;

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].value !== sorted[i-1].value + 1) return false;
    }

    return true;
  }

  checkWin(playerId) {
    const hand = this.hands[playerId];
    if (!hand || hand.length > 0) {
      return { success: false, error: 'Không thể ù - vẫn còn bài trên tay' };
    }

    this.gamePhase = 'finished';
    return { 
      success: true, 
      data: { 
        winner: playerId,
        gameOver: true 
      } 
    };
  }

  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
  }
}

module.exports = PhomGame;

