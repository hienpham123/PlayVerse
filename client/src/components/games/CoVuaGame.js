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

  const handleUndo = () => {
    // Kiểm tra xem có thể undo không (nước cờ cuối cùng phải là của người chơi này)
    if (!gameState || !gameState.moveHistory || gameState.moveHistory.length === 0) {
      alert('Không có nước cờ nào để quay lại');
      return;
    }

    const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
    
    if (lastMove.playerId !== user.id) {
      alert('Bạn chỉ có thể quay lại nước cờ của chính mình');
      return;
    }

    if (gameState.status !== 'playing') {
      alert('Không thể quay lại khi game đã kết thúc');
      return;
    }

    if (window.confirm('Bạn có chắc muốn quay lại nước cờ vừa đi?')) {
      onAction('undo', {});
    }
  };

  // Kiểm tra xem có thể undo không
  const canUndo = gameState && 
                  gameState.moveHistory && 
                  gameState.moveHistory.length > 0 &&
                  gameState.moveHistory[gameState.moveHistory.length - 1].playerId === user.id &&
                  gameState.status === 'playing';

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
            </div>
            <div className={`player-info-chess ${gameState.currentPlayerId !== user.id ? 'active' : ''}`}>
              <div className="player-name">
                {room.players.find(p => p.id !== user.id)?.username} ({gameState.myColor === 'white' ? 'Đen' : 'Trắng'})
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="chess-board-wrapper">
        {/* Quân đã bắt bên trái (đối thủ - quân đen) */}
        {gameState && gameState.capturedPieces && gameState.capturedPieces.opponent && gameState.capturedPieces.opponent.length > 0 && (
          <div className="captured-pieces-side captured-pieces-left">
            <div className="captured-pieces-title">Đã bắt</div>
            <div className="captured-pieces-list">
              {gameState.capturedPieces.opponent.map((p, idx) => {
                const symbols = {
                  'K': '♚', 'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞', 'P': '♟',
                  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
                };
                return (
                  <span key={idx} className="captured-piece">
                    {symbols[p] || p}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Bàn cờ */}
        {gameState && gameState.board && (
          <ChessBoard
            board={gameState.board}
            myColor={gameState.myColor}
            onCellClick={handleCellClick}
            currentPlayerId={gameState.currentPlayerId}
            myId={user.id}
            validMoves={validMoves}
            lastMove={gameState.lastMove}
          />
        )}

        {/* Quân đã bắt bên phải (của mình - quân trắng) */}
        {gameState && gameState.capturedPieces && gameState.capturedPieces.mine && gameState.capturedPieces.mine.length > 0 && (
          <div className="captured-pieces-side captured-pieces-right">
            <div className="captured-pieces-title">Đã bắt</div>
            <div className="captured-pieces-list">
              {gameState.capturedPieces.mine.map((p, idx) => {
                const symbols = {
                  'K': '♚', 'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞', 'P': '♟',
                  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
                };
                return (
                  <span key={idx} className="captured-piece">
                    {symbols[p] || p}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {(isMyTurn || canUndo) && gameState.status === 'playing' && (
        <div className="action-buttons">
          {canUndo && (
            <button className="btn btn-secondary" onClick={handleUndo} style={{ marginRight: '10px' }}>
              ↶ Quay lại
            </button>
          )}
          {isMyTurn && (
            <button className="btn btn-danger" onClick={handleResign}>
              Đầu hàng
            </button>
          )}
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

