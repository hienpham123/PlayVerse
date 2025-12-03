import React, { useState } from 'react';
import Card from '../../components/Card';
import '../../App.css';
import '../../components/GameRoom.css';

function TienLenGame({ user, room, gameState, onAction }) {
  const [selectedCards, setSelectedCards] = useState([]);
  const [error, setError] = useState('');

  const isMyTurn = gameState && gameState.currentPlayerId === user.id;
  const myHand = gameState?.myHand || [];

  const toggleCardSelection = (index) => {
    if (room.status !== 'playing') return;
    
    setSelectedCards(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index].sort((a, b) => a - b);
      }
    });
  };

  const handlePlayCards = () => {
    if (selectedCards.length === 0) {
      setError('Vui lòng chọn bài để đánh');
      return;
    }

    onAction('play-cards', { cards: selectedCards });
    setSelectedCards([]);
    setError('');
  };

  const handlePass = () => {
    onAction('pass', {});
    setSelectedCards([]);
    setError('');
  };

  return (
    <>
      {gameState.lastPlay && (
        <div className="last-play">
          <h3>Lượt đánh trước:</h3>
          <div className="cards-display">
            {gameState.lastPlay.map((card, index) => (
              <Card key={index} card={card} size="small" />
            ))}
          </div>
          <p>Người đánh: {gameState.lastPlayerId === user.id ? 'Bạn' : 'Đối thủ'}</p>
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
          {myHand.map((card, index) => (
            <Card
              key={index}
              card={card}
              selected={selectedCards.includes(index)}
              onClick={() => toggleCardSelection(index)}
              size="large"
            />
          ))}
        </div>
        {isMyTurn && (
          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={handlePlayCards}
              disabled={selectedCards.length === 0}
            >
              Đánh bài
            </button>
            <button className="btn btn-secondary" onClick={handlePass}>
              Bỏ lượt
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default TienLenGame;

