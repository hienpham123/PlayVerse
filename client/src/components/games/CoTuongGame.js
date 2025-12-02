import React, { useState, useEffect } from 'react';
import CoTuongBoard from '../CoTuongBoard';
import '../../App.css';
import '../GameRoom.css';

function CoTuongGame({ user, room, gameState, onAction }) {
  const [selectedPiece, setSelectedPiece] = useState(null);
  const isMyTurn = gameState && gameState.currentPlayerId === user.id;
  const isRed = gameState && gameState.myColor === 'red';
  const validMoves = gameState?.validMoves || [];

  useEffect(() => {
    setSelectedPiece(null);
  }, [gameState?.currentPlayerId]);

  const handleCellClick = (fromRow, fromCol, toRow, toCol) => {
    if (!isMyTurn) return;

    onAction('move', {
      fromRow,
      fromCol,
      toRow,
      toCol
    });
  };

  const handleResign = () => {
    if (window.confirm('Bạn có chắc muốn đầu hàng?')) {
      onAction('resign', {});
    }
  };

  const getStatusMessage = () => {
    if (!gameState) return '';
    
    if (gameState.status === 'finished') {
      if (gameState.winner === user.id) {
        return '🎉 Bạn đã thắng!';
      } else if (gameState.winner) {
        return '❌ Bạn đã thua!';
      } else {
        return '🤝 Hòa cờ!';
      }
    }
    
    if (gameState.status === 'checkmate') {
      if (gameState.winner === user.id) {
        return '🎉 Bạn đã thắng!';
      } else {
        return '❌ Bạn đã thua!';
      }
    }
    
    if (gameState.status === 'stalemate') {
      return '🤝 Hòa cờ!';
    }
    
    if (gameState.status === 'check') {
      if (isMyTurn) {
        return '⚠️ Tướng của bạn đang bị chiếu!';
      } else {
        return '⚠️ Đối thủ đang bị chiếu!';
      }
    }
    
    if (isMyTurn) {
      return '🎯 Đến lượt bạn!';
    } else {
      return '⏳ Đang chờ đối thủ...';
    }
  };

  const getPieceName = (piece) => {
    const names = {
      'K': '帥', 'A': '仕', 'E': '相', 'R': '車', 'C': '炮', 'H': '馬', 'P': '兵',
      'k': '將', 'a': '士', 'e': '象', 'r': '車', 'c': '砲', 'h': '馬', 'p': '卒'
    };
    return names[piece] || piece;
  };

  return (
    <div className="cotuong-game-section">
      <div className="game-status">
        <h3>{getStatusMessage()}</h3>
        {gameState && (
          <div className="players-info-chess">
            <div className={`player-info-chess ${gameState.currentPlayerId === user.id ? 'active' : ''}`}>
              <div className="player-name">
                {room.players.find(p => p.id === user.id)?.username} ({gameState.myColor === 'red' ? 'Đỏ' : 'Đen'})
              </div>
            </div>
            <div className={`player-info-chess ${gameState.currentPlayerId !== user.id ? 'active' : ''}`}>
              <div className="player-name">
                {room.players.find(p => p.id !== user.id)?.username} ({gameState.myColor === 'red' ? 'Đen' : 'Đỏ'})
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="chess-board-wrapper">
        {/* Quân đã bắt bên trái (đối thủ) */}
        {gameState && gameState.capturedPieces && gameState.capturedPieces.opponent && gameState.capturedPieces.opponent.length > 0 && (
          <div className="captured-pieces-side captured-pieces-left">
            <div className="captured-pieces-title">Đã bắt</div>
            <div className="captured-pieces-list">
              {gameState.capturedPieces.opponent.map((p, idx) => (
                <span key={idx} className="captured-piece">
                  {getPieceName(p)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bàn cờ */}
        {gameState && gameState.board && (
          <CoTuongBoard
            board={gameState.board}
            myColor={gameState.myColor}
            onCellClick={handleCellClick}
            currentPlayerId={gameState.currentPlayerId}
            myId={user.id}
            validMoves={validMoves}
            lastMove={gameState.lastMove}
          />
        )}

        {/* Quân đã bắt bên phải (của mình) */}
        {gameState && gameState.capturedPieces && gameState.capturedPieces.mine && gameState.capturedPieces.mine.length > 0 && (
          <div className="captured-pieces-side captured-pieces-right">
            <div className="captured-pieces-title">Đã bắt</div>
            <div className="captured-pieces-list">
              {gameState.capturedPieces.mine.map((p, idx) => (
                <span key={idx} className="captured-piece">
                  {getPieceName(p)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {isMyTurn && gameState.status === 'playing' && (
        <div className="action-buttons">
          <button className="btn btn-secondary" onClick={handleResign}>
            Đầu hàng
          </button>
        </div>
      )}
    </div>
  );
}

export default CoTuongGame;

