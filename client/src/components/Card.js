import React from 'react';
import './Card.css';

function Card({ card, selected = false, onClick, size = 'medium' }) {
  if (!card) return null;

  const getSuitSymbol = (suit) => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return '';
    }
  };

  const getSuitColor = (suit) => {
    return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
  };

  const suitSymbol = getSuitSymbol(card.suit);
  const suitColor = getSuitColor(card.suit);
  const sizeClass = `card-${size}`;

  return (
    <div
      className={`playing-card ${sizeClass} ${selected ? 'selected' : ''} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      style={{ color: suitColor }}
    >
      <div className="card-rank">{card.rank}</div>
      <div className="card-suit">{suitSymbol}</div>
    </div>
  );
}

export default Card;

