import React, { useState } from 'react';
import Card from '../Card';
import '../../App.css';
import '../GameRoom.css';

function PhomGame({ user, room, gameState, onAction }) {
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

  const handleDrawCard = (fromDiscard = false) => {
    onAction('draw-card', { fromDiscard });
    setError('');
  };

  const handleDiscardCard = () => {
    if (selectedCards.length !== 1) {
      setError('Vui lòng chọn 1 lá bài để bỏ');
      return;
    }

    onAction('discard-card', { cardIndex: selectedCards[0] });
    setSelectedCards([]);
    setError('');
  };

  const handleFormPhom = () => {
    if (selectedCards.length < 3) {
      setError('Phỏm phải có ít nhất 3 lá bài');
      return;
    }

    onAction('form-phom', { cards: selectedCards });
    setSelectedCards([]);
    setError('');
  };

  const handleWin = () => {
    onAction('win', {});
    setError('');
  };

  return (
    <>
      {gameState.discardPile && gameState.discardPile.length > 0 && (
        <div className="last-play">
          <h3>Lá bài bỏ:</h3>
          <div className="cards-display">
            {gameState.discardPile.map((card, index) => (
              <Card 
                key={index} 
                card={card} 
                size="small"
                onClick={() => isMyTurn && handleDrawCard(true)}
                style={{ cursor: isMyTurn ? 'pointer' : 'default' }}
              />
            ))}
          </div>
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
              onClick={() => handleDrawCard(false)}
            >
              Rút bài ({gameState.drawPileCount || 0} lá còn lại)
            </button>
            {gameState.discardPile && gameState.discardPile.length > 0 && (
              <button
                className="btn btn-primary"
                onClick={() => handleDrawCard(true)}
              >
                Rút từ đống bỏ
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={handleDiscardCard}
              disabled={selectedCards.length !== 1}
            >
              Bỏ bài
            </button>
            <button
              className="btn btn-success"
              onClick={handleFormPhom}
              disabled={selectedCards.length < 3}
            >
              Tạo phỏm
            </button>
            {myHand.length === 0 && (
              <button
                className="btn btn-success"
                onClick={handleWin}
              >
                Ù
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default PhomGame;

