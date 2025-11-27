import React from 'react';
import './CoVayBoard.css';

function CoVayBoard({ board, boardSize, onCellClick, currentPlayerId, myId }) {
  const isMyTurn = currentPlayerId === myId;

  const handleCellClick = (row, col) => {
    if (!isMyTurn) return;
    if (board[row][col] !== 0) return;
    onCellClick(row, col);
  };

  const renderStone = (value) => {
    if (value === 0) return null;
    return (
      <div className={`stone stone-${value === 1 ? 'black' : 'white'}`}></div>
    );
  };

  return (
    <div className="covay-board-container">
      <div className="covay-board" style={{ gridTemplateColumns: `repeat(${boardSize}, 1fr)` }}>
        {Array.from({ length: boardSize * boardSize }).map((_, index) => {
          const row = Math.floor(index / boardSize);
          const col = index % boardSize;
          const value = board[row][col];
          const isStarPoint = isStarPointPosition(row, col, boardSize);

          return (
            <div
              key={index}
              className={`board-cell ${isStarPoint ? 'star-point' : ''} ${isMyTurn && value === 0 ? 'clickable' : ''}`}
              onClick={() => handleCellClick(row, col)}
            >
              {renderStone(value)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function isStarPointPosition(row, col, size) {
  const starPoints = [3, 9, 15];
  return starPoints.includes(row) && starPoints.includes(col);
}

export default CoVayBoard;

