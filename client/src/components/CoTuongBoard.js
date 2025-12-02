import React, { useState } from 'react';
import './CoTuongBoard.css';

const PIECE_SYMBOLS = {
  'K': '帥', 'A': '仕', 'E': '相', 'R': '車', 'C': '炮', 'H': '馬', 'P': '兵',
  'k': '將', 'a': '士', 'e': '象', 'r': '車', 'c': '砲', 'h': '馬', 'p': '卒'
};

const PIECE_NAMES = {
  'K': '帥', 'A': '仕', 'E': '相', 'R': '車', 'C': '炮', 'H': '馬', 'P': '兵',
  'k': '將', 'a': '士', 'e': '象', 'r': '車', 'c': '砲', 'h': '馬', 'p': '卒'
};

function CoTuongBoard({ board, myColor, onCellClick, currentPlayerId, myId, validMoves = [], lastMove = null }) {
  const [selectedCell, setSelectedCell] = useState(null);
  const isMyTurn = currentPlayerId === myId;
  const isRed = myColor === 'red';

  const handleCellClick = (row, col) => {
    if (!isMyTurn) return;

    const piece = board[row][col];
    const isMyPiece = piece && piece !== 0 && (
      (isRed && piece === piece.toUpperCase()) || 
      (!isRed && piece === piece.toLowerCase())
    );

    // If clicking on a selected cell, deselect
    if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
      setSelectedCell(null);
      return;
    }

    // If clicking on my piece, select it
    if (isMyPiece) {
      setSelectedCell({ row, col });
      return;
    }

    // If a piece is selected, try to move
    if (selectedCell) {
      // Check if this is a valid move
      const isValidMove = validMoves.some(
        move => move.fromRow === selectedCell.row && 
                move.fromCol === selectedCell.col &&
                move.toRow === row && 
                move.toCol === col
      );

      if (isValidMove) {
        onCellClick(selectedCell.row, selectedCell.col, row, col);
        setSelectedCell(null);
      } else {
        // If clicking on another of my pieces, select that instead
        if (isMyPiece) {
          setSelectedCell({ row, col });
        } else {
          setSelectedCell(null);
        }
      }
    }
  };

  const getValidMovesForSelected = () => {
    if (!selectedCell) return [];
    return validMoves.filter(
      move => move.fromRow === selectedCell.row && move.fromCol === selectedCell.col
    );
  };

  const validMovesForSelected = getValidMovesForSelected();

  const isInPalace = (row, col, isRed) => {
    if (isRed) {
      return row >= 7 && row <= 9 && col >= 3 && col <= 5;
    } else {
      return row >= 0 && row <= 2 && col >= 3 && col <= 5;
    }
  };

  const renderCell = (row, col) => {
    const piece = board[row][col];
    const isSelected = selectedCell && selectedCell.row === row && selectedCell.col === col;
    const isValidMoveTarget = validMovesForSelected.some(
      move => move.toRow === row && move.toCol === col
    );
    const isClickable = isMyTurn && (piece === 0 || isValidMoveTarget || 
      (piece && piece !== 0 && ((isRed && piece === piece.toUpperCase()) || (!isRed && piece === piece.toLowerCase()))));

    const isValidPiece = piece && piece !== 0 && typeof piece === 'string' && PIECE_SYMBOLS[piece];
    
    // Kiểm tra xem đây có phải là quân đối phương có thể bị bắt không
    const isCapturablePiece = isValidPiece && isValidMoveTarget && 
      ((isRed && piece === piece.toLowerCase()) || (!isRed && piece === piece.toUpperCase()));

    // Check if this is the last move
    const isLastMoveFrom = lastMove && lastMove.from && 
                          lastMove.from.row === row && lastMove.from.col === col;
    const isLastMoveTo = lastMove && lastMove.to && 
                        lastMove.to.row === row && lastMove.to.col === col;
    const isLastMove = isLastMoveFrom || isLastMoveTo;

    // Bàn cờ tướng có sông ở giữa (hàng 4-5)
    const isRiver = row === 4 || row === 5;
    const isPalaceCell = isInPalace(row, col, true) || isInPalace(row, col, false);
    
    // Màu nền: nền vàng nhạt, viền đen
    const cellClass = `cotuong-cell ${isSelected ? 'selected' : ''} ${isValidMoveTarget && !isCapturablePiece ? 'valid-move' : ''} ${isCapturablePiece ? 'capturable' : ''} ${isLastMove ? 'last-move' : ''} ${isClickable ? 'clickable' : ''} ${isPalaceCell ? 'palace' : ''} ${isRiver ? 'river' : ''}`;

    return (
      <div
        key={`${row}-${col}`}
        className={cellClass}
        onClick={() => handleCellClick(row, col)}
      >
        {isValidPiece ? (
          <span className={`cotuong-piece ${piece === piece.toUpperCase() ? 'red-piece' : 'black-piece'} ${isCapturablePiece ? 'capturable-piece' : ''}`}>
            {PIECE_SYMBOLS[piece]}
          </span>
        ) : null}
        {isValidMoveTarget && !isValidPiece && (
          <div className="valid-move-indicator"></div>
        )}
      </div>
    );
  };

  return (
    <div className="cotuong-board">
      {/* Vẽ sông */}
      <div className="river-line river-top"></div>
      <div className="river-line river-bottom"></div>
      
      {/* Vẽ cung */}
      {[true, false].map((isRed, idx) => (
        <React.Fragment key={idx}>
          {isRed ? (
            <>
              <div className="palace-line palace-diagonal-1 palace-red-1"></div>
              <div className="palace-line palace-diagonal-2 palace-red-2"></div>
            </>
          ) : (
            <>
              <div className="palace-line palace-diagonal-1 palace-black-1"></div>
              <div className="palace-line palace-diagonal-2 palace-black-2"></div>
            </>
          )}
        </React.Fragment>
      ))}

      {/* Các ô cờ */}
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="cotuong-row">
          {row.map((cell, colIndex) => renderCell(rowIndex, colIndex))}
        </div>
      ))}
    </div>
  );
}

export default CoTuongBoard;

