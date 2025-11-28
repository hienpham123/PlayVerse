import React, { useState } from 'react';
import './ChessBoard.css';

const PIECE_SYMBOLS = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

function ChessBoard({ board, myColor, onCellClick, currentPlayerId, myId, validMoves = [], lastMove = null }) {
  const [selectedCell, setSelectedCell] = useState(null);
  const isMyTurn = currentPlayerId === myId;
  const isWhite = myColor === 'white';

  const handleCellClick = (row, col) => {
    if (!isMyTurn) return;

    const piece = board[row][col];
    const isMyPiece = piece && (
      (isWhite && piece === piece.toUpperCase()) || 
      (!isWhite && piece === piece.toLowerCase())
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

  const renderCell = (row, col) => {
    const piece = board[row][col];
    const isLight = (row + col) % 2 === 0;
    const isSelected = selectedCell && selectedCell.row === row && selectedCell.col === col;
    const isValidMoveTarget = validMovesForSelected.some(
      move => move.toRow === row && move.toCol === col
    );
    const isClickable = isMyTurn && (piece === 0 || isValidMoveTarget || 
      (piece && ((isWhite && piece === piece.toUpperCase()) || (!isWhite && piece === piece.toLowerCase()))));

    // Kiểm tra xem có phải là quân cờ hợp lệ không (không phải số 0)
    const isValidPiece = piece && 
                         piece !== 0 && 
                         piece !== '0' && 
                         typeof piece === 'string' && 
                         piece.length > 0 &&
                         PIECE_SYMBOLS[piece];

    // Kiểm tra xem đây có phải là nước cờ vừa đi không
    const isLastMoveFrom = lastMove && lastMove.from && 
                          lastMove.from.row === row && lastMove.from.col === col;
    const isLastMoveTo = lastMove && lastMove.to && 
                        lastMove.to.row === row && lastMove.to.col === col;
    const isLastMove = isLastMoveFrom || isLastMoveTo;

    return (
      <div
        key={`${row}-${col}`}
        className={`chess-cell ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''} ${isValidMoveTarget ? 'valid-move' : ''} ${isLastMove ? 'last-move' : ''} ${isClickable ? 'clickable' : ''}`}
        onClick={() => handleCellClick(row, col)}
      >
        {isValidPiece ? (
          <span className={`chess-piece ${piece === piece.toUpperCase() ? 'white-piece' : 'black-piece'}`}>
            {PIECE_SYMBOLS[piece]}
          </span>
        ) : isValidMoveTarget ? (
          <div className="move-indicator"></div>
        ) : null}
      </div>
    );
  };

  // Render board from white's perspective (row 0 at top) or black's (row 7 at top)
  const renderBoard = () => {
    const rows = [];
    const startRow = isWhite ? 0 : 7;
    const endRow = isWhite ? 8 : -1;
    const step = isWhite ? 1 : -1;

    for (let row = startRow; row !== endRow; row += step) {
      const cells = [];
      const startCol = isWhite ? 0 : 7;
      const endCol = isWhite ? 8 : -1;
      const colStep = isWhite ? 1 : -1;

      for (let col = startCol; col !== endCol; col += colStep) {
        cells.push(renderCell(row, col));
      }
      rows.push(
        <div key={row} className="chess-row">
          <div className="row-label">{isWhite ? 8 - row : row + 1}</div>
          {cells}
        </div>
      );
    }

    // Add column labels
    const colLabels = [];
    const colStart = isWhite ? 0 : 7;
    const colEnd = isWhite ? 8 : -1;
    const colStep = isWhite ? 1 : -1;
    
    for (let col = colStart; col !== colEnd; col += colStep) {
      colLabels.push(
        <div key={col} className="col-label">
          {String.fromCharCode(97 + col)}
        </div>
      );
    }

    return (
      <>
        {/* Column labels at top (a-h) */}
        <div className="chess-row chess-row-labels">
          <div className="row-label"></div>
          {colLabels}
        </div>
        {/* Board rows with row labels (1-8) */}
        {rows}
      </>
    );
  };

  return (
    <div className="chess-board-container">
      <div className="chess-board">
        {renderBoard()}
      </div>
    </div>
  );
}

export default ChessBoard;

