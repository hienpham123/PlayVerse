import React, { useState, useEffect } from 'react';
import ChessBoard from '../ChessBoard';
import '../../App.css';
import '../GameRoom.css';

function CoVuaGame({ user, room, gameState, onAction }) {
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [promotionModal, setPromotionModal] = useState(null);
  const isMyTurn = gameState && gameState.currentPlayerId === user.id;
  const isWhite = gameState && gameState.myColor === 'white';
  const validMoves = gameState?.validMoves || [];

  useEffect(() => {
    // Reset selection when turn changes
    setSelectedPiece(null);
  }, [gameState?.currentPlayerId]);

  const handleCellClick = (fromRow, fromCol, toRow, toCol) => {
    if (!isMyTurn) return;

    const piece = gameState.board[fromRow][fromCol];
    const pieceType = piece ? piece.toUpperCase() : '';

    // Check if pawn promotion is needed
    if (pieceType === 'P' && ((isWhite && toRow === 0) || (!isWhite && toRow === 7))) {
      setPromotionModal({ fromRow, fromCol, toRow, toCol });
      return;
    }

    onAction('move', {
      fromRow,
      fromCol,
      toRow,
      toCol
    });
  };

  const handlePromotion = (promotionPiece) => {
    if (!promotionModal) return;

    onAction('move', {
      fromRow: promotionModal.fromRow,
      fromCol: promotionModal.fromCol,
      toRow: promotionModal.toRow,
      toCol: promotionModal.toCol,
      promotion: promotionPiece
    });

    setPromotionModal(null);
  };

  const handleResign = () => {
    if (window.confirm('Bạn có chắc muốn đầu hàng?')) {
      onAction('resign', {});
    }
  };

  const getStatusMessage = () => {
    if (!gameState) return '';
    
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
        return '⚠️ Vua của bạn đang bị chiếu!';
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

  return (
    <div className="covua-game-section">
      <div className="game-status">
        <h3>{getStatusMessage()}</h3>
        {gameState && (
          <div className="players-info-chess">
            <div className={`player-info-chess ${gameState.currentPlayerId === user.id ? 'active' : ''}`}>
              <div className="player-name">
                {room.players.find(p => p.id === user.id)?.username} ({gameState.myColor === 'white' ? 'Trắng' : 'Đen'})
              </div>
              {gameState.capturedPieces && gameState.capturedPieces.mine && gameState.capturedPieces.mine.length > 0 && (
                <div className="captured-pieces">
                  Đã bắt: {gameState.capturedPieces.mine.map(p => {
                    const symbols = {
                      'K': '♚', 'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞', 'P': '♟',
                      'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
                    };
                    return symbols[p] || p;
                  }).join(' ')}
                </div>
              )}
            </div>
            <div className={`player-info-chess ${gameState.currentPlayerId !== user.id ? 'active' : ''}`}>
              <div className="player-name">
                {room.players.find(p => p.id !== user.id)?.username} ({gameState.myColor === 'white' ? 'Đen' : 'Trắng'})
              </div>
              {gameState.capturedPieces && gameState.capturedPieces.opponent && gameState.capturedPieces.opponent.length > 0 && (
                <div className="captured-pieces">
                  Đã bắt: {gameState.capturedPieces.opponent.map(p => {
                    const symbols = {
                      'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
                      'k': '♔', 'q': '♕', 'r': '♖', 'b': '♗', 'n': '♘', 'p': '♙'
                    };
                    return symbols[p] || p;
                  }).join(' ')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {gameState && gameState.board && (
        <ChessBoard
          board={gameState.board}
          myColor={gameState.myColor}
          onCellClick={handleCellClick}
          currentPlayerId={gameState.currentPlayerId}
          myId={user.id}
          validMoves={validMoves}
        />
      )}

      {isMyTurn && gameState.status === 'playing' && (
        <div className="action-buttons">
          <button className="btn btn-danger" onClick={handleResign}>
            Đầu hàng
          </button>
        </div>
      )}

      {promotionModal && (
        <div className="modal-overlay" onClick={() => setPromotionModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Chọn quân cờ để phong cấp:</h3>
            <div className="promotion-options">
              {['Q', 'R', 'B', 'N'].map(piece => (
                <button
                  key={piece}
                  className="btn btn-primary promotion-btn"
                  onClick={() => handlePromotion(piece)}
                >
                  {piece === 'Q' ? '♕' : piece === 'R' ? '♖' : piece === 'B' ? '♗' : '♘'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CoVuaGame;

