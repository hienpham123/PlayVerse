import React from 'react';
import '../../App.css';
import './XOGame.css';

function XOGame({ user, room, gameState, onAction }) {
  const isSpectator = gameState?.isSpectator || false;
  const isMyTurn = gameState && gameState.isMyTurn && !isSpectator;
  const boardSize = gameState?.boardSize || 15;
  const board = gameState?.board || Array(boardSize).fill(null).map(() => Array(boardSize).fill(null));
  const mySymbol = gameState?.mySymbol || 'X';
  const winner = gameState?.winner;
  const winningLine = gameState?.winningLine || [];
  const lastMove = gameState?.lastMove;
  const moveHistory = gameState?.moveHistory || [];

  const handleCellClick = (row, col) => {
    if (isSpectator) return; // Spectator không thể chơi
    if (!isMyTurn) return;
    if (board[row][col] !== null) return;
    if (gameState?.status === 'finished') return;

    onAction('make-move', { row, col });
  };

  const isWinningCell = (row, col) => {
    return winningLine.some(pos => pos.row === row && pos.col === col);
  };

  const isLastMove = (row, col) => {
    return lastMove && lastMove.row === row && lastMove.col === col;
  };

  const handleUndo = () => {
    if (!moveHistory || moveHistory.length === 0) {
      alert('Không có nước cờ nào để quay lại');
      return;
    }

    const lastMoveRecord = moveHistory[moveHistory.length - 1];
    
    if (lastMoveRecord.playerId !== user.id) {
      alert('Bạn chỉ có thể quay lại nước cờ của chính mình');
      return;
    }

    if (gameState?.status === 'finished') {
      alert('Không thể quay lại khi game đã kết thúc');
      return;
    }

    if (window.confirm('Bạn có chắc muốn quay lại nước cờ vừa đi?')) {
      onAction('undo', {});
    }
  };

  const canUndo = moveHistory && 
                  moveHistory.length > 0 &&
                  moveHistory[moveHistory.length - 1].playerId === user.id &&
                  gameState?.status === 'playing';

  const renderCell = (row, col) => {
    const cellValue = board[row][col];
    const isWinCell = isWinningCell(row, col);
    const isLastMoveCell = isLastMove(row, col);
    
    return (
      <div
        key={`${row}-${col}`}
        className={`xo-cell ${isWinCell ? 'winning' : ''} ${isLastMoveCell ? 'last-move' : ''} ${cellValue ? 'filled' : 'empty'}`}
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
    if (isSpectator) {
      const currentPlayer = room?.players?.find(p => p.id === gameState?.currentPlayerId);
      const currentPlayerName = currentPlayer?.username || 'Người chơi';
      return `👁️ Chế độ khán giả - Đến lượt: ${currentPlayerName}`;
    }
    
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

  const isUserSpectator = isSpectator || (!room?.players?.some(p => p.id === user.id) && room?.spectators?.some(s => s.id === user.id));

  return (
    <div className="xo-game-container">
      {isUserSpectator && (
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          marginBottom: '15px',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          👁️ Bạn đang xem với tư cách khán giả
        </div>
      )}
      <div className="xo-status">
        <h3>{getStatusMessage()}</h3>
      </div>

      <div className="xo-board" style={{ gridTemplateColumns: `repeat(${boardSize}, 1fr)` }}>
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => renderCell(rowIndex, colIndex))
        )}
      </div>

      {canUndo && (
        <div className="action-buttons" style={{ marginTop: '15px' }}>
          <button className="btn btn-secondary" onClick={handleUndo}>
            ↶ Quay lại
          </button>
        </div>
      )}

      {gameState?.status === 'finished' && (
        <div className="xo-game-over">
          <p>Game đã kết thúc!</p>
        </div>
      )}
    </div>
  );
}

export default XOGame;

