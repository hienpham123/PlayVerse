import React from 'react';
import CoVayBoard from '../../components/CoVayBoard';
import '../../App.css';
import '../../components/GameRoom.css';

function CoVayGame({ user, room, gameState, onAction }) {
  const isMyTurn = gameState && gameState.currentPlayerId === user.id;

  const handlePlaceStone = (row, col) => {
    onAction('place-stone', { row, col });
  };

  const handlePass = () => {
    onAction('pass', {});
  };

  const handleResign = () => {
    if (window.confirm('Bạn có chắc muốn đầu hàng?')) {
      onAction('resign', {});
    }
  };

  return (
    <div className="covay-game-section">
      <CoVayBoard
        board={gameState.board}
        boardSize={gameState.boardSize || 19}
        myColor={gameState.myColor}
        onCellClick={handlePlaceStone}
        currentPlayerId={gameState.currentPlayerId}
        myId={user.id}
      />
      {isMyTurn && (
        <div className="action-buttons">
          <button className="btn btn-secondary" onClick={handlePass}>
            Bỏ lượt
          </button>
          <button className="btn btn-danger" onClick={handleResign}>
            Đầu hàng
          </button>
        </div>
      )}
    </div>
  );
}

export default CoVayGame;

