import React from 'react';
import '../../App.css';
import './XOGame.css';

function XOGame({ user, room, gameState, onAction }) {
  const isMyTurn = gameState && gameState.isMyTurn;
  const boardSize = gameState?.boardSize || 5;
  const board = gameState?.board || Array(boardSize).fill(null).map(() => Array(boardSize).fill(null));
  const mySymbol = gameState?.mySymbol || 'X';
  const winner = gameState?.winner;
  const winningLine = gameState?.winningLine || [];

  const handleCellClick = (row, col) => {
    if (!isMyTurn) return;
    if (board[row][col] !== null) return;
    if (gameState?.status === 'finished') return;

    onAction('make-move', { row, col });
  };

  const isWinningCell = (row, col) => {
    return winningLine.some(pos => pos.row === row && pos.col === col);
  };

  const renderCell = (row, col) => {
    const cellValue = board[row][col];
    const isWinCell = isWinningCell(row, col);
    
    return (
      <div
        key={`${row}-${col}`}
        className={`xo-cell ${isWinCell ? 'winning' : ''} ${cellValue ? 'filled' : 'empty'}`}
        onClick={() => handleCellClick(row, col)}
      >
        {cellValue && (
          <span className={`xo-symbol ${cellValue.toLowerCase()}`}>
            {cellValue}
          </span>
        )}
      </div>
    );
  };

  const getStatusMessage = () => {
    if (gameState?.status === 'finished') {
      if (winner === null) {
        return '🎉 Hòa!';
      } else if (winner === user.id) {
        return '🎊 Bạn đã thắng!';
      } else {
        const winnerName = room?.players?.find(p => p.id === winner)?.username || 'Đối thủ';
        return `Người thắng: ${winnerName}`;
      }
    }
    
    if (isMyTurn) {
      return `🎯 Đến lượt bạn (${mySymbol})`;
    } else {
      return `Đợi đối thủ...`;
    }
  };

  return (
    <div className="xo-game-container">
      <div className="xo-status">
        <h3>{getStatusMessage()}</h3>
      </div>

      <div className="xo-board">
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="xo-row">
            {row.map((cell, colIndex) => renderCell(rowIndex, colIndex))}
          </div>
        ))}
      </div>

      {gameState?.status === 'finished' && (
        <div className="xo-game-over">
          <p>Game đã kết thúc!</p>
        </div>
      )}
    </div>
  );
}

export default XOGame;

