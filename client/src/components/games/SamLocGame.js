import React, { useState, useEffect } from 'react';
import Card from '../Card';
import '../../App.css';
import '../GameRoom.css';

function SamLocGame({ user, room, gameState, onAction }) {
  const [selectedCards, setSelectedCards] = useState([]);
  const [error, setError] = useState('');

  const isMyTurn = gameState && gameState.currentPlayerId === user.id;
  const myHand = gameState?.myHand || [];

  // Filter out invalid selected card indices
  const validSelectedCards = selectedCards.filter(idx => idx >= 0 && idx < myHand.length);

  // Reset selected cards when hand changes (after playing cards), when turn changes, or when lastPlay changes
  useEffect(() => {
    setSelectedCards([]);
  }, [gameState?.myHand?.length, gameState?.currentPlayerId, gameState?.lastPlay]);

  const toggleCardSelection = (index) => {
    if (room.status !== 'playing') return;
    if (!isMyTurn) return;
    if (index < 0 || index >= myHand.length) return; // Validate index
    
    setSelectedCards(prev => {
      // Filter out invalid indices first
      const validPrev = prev.filter(i => i >= 0 && i < myHand.length);
      if (validPrev.includes(index)) {
        return validPrev.filter(i => i !== index);
      } else {
        return [...validPrev, index].sort((a, b) => a - b);
      }
    });
  };

  const handlePlayCards = () => {
    if (validSelectedCards.length === 0) {
      setError('Vui lòng chọn bài để đánh');
      return;
    }

    onAction('play-cards', { cards: validSelectedCards });
    setSelectedCards([]);
    setError('');
  };

  const handlePass = () => {
    onAction('pass', {});
    setSelectedCards([]);
    setError('');
  };

  const getPlayTypeName = (cards) => {
    if (!cards || cards.length === 0) return '';
    if (cards.length === 1) return 'Đơn';
    if (cards.length === 2) return 'Đôi';
    if (cards.length === 3) {
      const ranks = cards.map(c => c.rank);
      const uniqueRanks = new Set(ranks);
      return uniqueRanks.size === 1 ? 'Ba' : 'Sảnh';
    }
    if (cards.length === 4) {
      const ranks = cards.map(c => c.rank);
      const uniqueRanks = new Set(ranks);
      return uniqueRanks.size === 1 ? 'Tứ quý' : 'Sảnh';
    }
    return 'Sảnh';
  };

  return (
    <>
      {gameState.lastPlay && (
        <div className="last-play">
          <h3>Lượt đánh trước ({getPlayTypeName(gameState.lastPlay)}):</h3>
          <div className="cards-display">
            {gameState.lastPlay.map((card, index) => (
              <Card key={index} card={card} size="small" />
            ))}
          </div>
          <p>Người đánh: {gameState.lastPlayerId === user.id ? 'Bạn' : room.players.find(p => p.id === gameState.lastPlayerId)?.username || 'Đối thủ'}</p>
        </div>
      )}

      {isMyTurn && (
        <div className="turn-indicator">
          <h2>🎯 Đến lượt bạn!</h2>
        </div>
      )}

      {error && (
        <div className="error-message">{error}</div>
      )}

      <div className="my-hand">
        <h3>Bài của bạn ({myHand.length} lá)</h3>
        <div className="cards-container">
          {myHand.map((card, index) => {
            // Create unique key for each card based on suit and rank
            const cardKey = `${card.suit}-${card.rank}-${index}`;
            return (
              <Card
                key={cardKey}
                card={card}
                selected={validSelectedCards.includes(index)}
                onClick={() => toggleCardSelection(index)}
                size="large"
              />
            );
          })}
        </div>
        {isMyTurn && (
          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={handlePlayCards}
              disabled={validSelectedCards.length === 0}
            >
              Đánh bài {validSelectedCards.length > 0 && `(${getPlayTypeName(validSelectedCards.map(i => myHand[i]))})`}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={handlePass}
            >
              Bỏ lượt
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default SamLocGame;
