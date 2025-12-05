import React, { useState, useEffect } from 'react';
import '../../App.css';
import './TaiXiuGame.css';

// Component để vẽ xúc xắc với các chấm đen
function DiceFace({ value }) {
  if (!value || value < 1 || value > 6) return null;
  
  const dots = [];
  
  // Tạo các chấm dựa trên giá trị
  if (value === 1) {
    dots.push(<div key="center" className="dice-dot center"></div>);
  } else if (value === 2) {
    dots.push(<div key="top-left" className="dice-dot top-left"></div>);
    dots.push(<div key="bottom-right" className="dice-dot bottom-right"></div>);
  } else if (value === 3) {
    dots.push(<div key="top-left" className="dice-dot top-left"></div>);
    dots.push(<div key="center" className="dice-dot center"></div>);
    dots.push(<div key="bottom-right" className="dice-dot bottom-right"></div>);
  } else if (value === 4) {
    dots.push(<div key="top-left" className="dice-dot top-left"></div>);
    dots.push(<div key="top-right" className="dice-dot top-right"></div>);
    dots.push(<div key="bottom-left" className="dice-dot bottom-left"></div>);
    dots.push(<div key="bottom-right" className="dice-dot bottom-right"></div>);
  } else if (value === 5) {
    dots.push(<div key="top-left" className="dice-dot top-left"></div>);
    dots.push(<div key="top-right" className="dice-dot top-right"></div>);
    dots.push(<div key="center" className="dice-dot center"></div>);
    dots.push(<div key="bottom-left" className="dice-dot bottom-left"></div>);
    dots.push(<div key="bottom-right" className="dice-dot bottom-right"></div>);
  } else if (value === 6) {
    dots.push(<div key="top-left" className="dice-dot top-left"></div>);
    dots.push(<div key="top-right" className="dice-dot top-right"></div>);
    dots.push(<div key="middle-left" className="dice-dot middle-left"></div>);
    dots.push(<div key="middle-right" className="dice-dot middle-right"></div>);
    dots.push(<div key="bottom-left" className="dice-dot bottom-left"></div>);
    dots.push(<div key="bottom-right" className="dice-dot bottom-right"></div>);
  }
  
  return <div className="dice-face-real">{dots}</div>;
}

function TaiXiuGame({ user, room, gameState, onAction }) {
  const [betAmount, setBetAmount] = useState(100);
  const [timeLeft, setTimeLeft] = useState(20);
  const [resultTimeLeft, setResultTimeLeft] = useState(5);
  const [localRevealedDice, setLocalRevealedDice] = useState([false, false, false]); // Local state để UI mượt mà
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragStartY, setDragStartY] = useState(0);
  const [currentDragY, setCurrentDragY] = useState(0);
  const isSpectator = gameState?.isSpectator || false;
  const allDiceRevealed = gameState?.allDiceRevealed || false;
  const status = gameState?.status || 'betting';
  const dice = gameState?.dice || [null, null, null];
  const sum = gameState?.sum;
  const result = gameState?.result;
  const myBet = gameState?.myBet || null;
  const winners = gameState?.winners || [];
  const round = gameState?.round || 1;
  const roundHistory = gameState?.roundHistory || [];
  const players = gameState?.players || [];
  const bettingTimeLeft = gameState?.bettingTimeLeft || 0;
  const finishedStartTime = gameState?.finishedStartTime;
  const resultDisplayTime = gameState?.resultDisplayTime || 5;

  // Update countdown timer cho đặt cược
  useEffect(() => {
    if (status === 'betting' && bettingTimeLeft > 0) {
      setTimeLeft(bettingTimeLeft);
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else if (status !== 'betting') {
      setTimeLeft(0);
    }
  }, [status, bettingTimeLeft]);

  // Update countdown timer cho hiển thị kết quả
  useEffect(() => {
    if (status === 'finished' && finishedStartTime) {
      const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - new Date(finishedStartTime).getTime()) / 1000);
        const timeRemaining = Math.max(0, resultDisplayTime - elapsed);
        setResultTimeLeft(timeRemaining);
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setResultTimeLeft(resultDisplayTime);
    }
  }, [status, finishedStartTime, resultDisplayTime]);

  // Sync revealed dice from server
  useEffect(() => {
    const serverRevealedDice = gameState?.revealedDice || [false, false, false];
    if (serverRevealedDice) {
      setLocalRevealedDice([...serverRevealedDice]);
    }
  }, [gameState?.revealedDice]);

  // Reset revealed dice when new round starts
  useEffect(() => {
    if (status === 'betting') {
      setLocalRevealedDice([false, false, false]);
    }
  }, [status, round]);

  const handlePlaceBet = (choice) => {
    if (isSpectator) return;
    if (status !== 'betting') return;
    if (timeLeft <= 0) {
      alert('Hết thời gian đặt cược');
      return;
    }
    if (!betAmount || betAmount <= 0) {
      alert('Vui lòng nhập số tiền cược hợp lệ');
      return;
    }

    onAction('place-bet', { choice, amount: betAmount });
  };

  // Không cần getDiceEmoji nữa, sử dụng DiceFace component

  const isWinner = (playerId) => {
    return winners.some(w => w.playerId === playerId);
  };

  // Handle mouse down - start dragging
  const handleMouseDown = (e, index) => {
    if (localRevealedDice[index] || status !== 'finished') return;
    e.preventDefault();
    setDraggingIndex(index);
    setDragStartY(e.clientY);
    setCurrentDragY(0);
  };

  // Handle mouse move for dragging
  useEffect(() => {
    if (draggingIndex === null) return;

    const handleMouseMove = (e) => {
      const deltaY = dragStartY - e.clientY; // Kéo lên là giá trị dương
      setCurrentDragY(Math.max(0, Math.min(150, deltaY))); // Giới hạn tối đa 150px
    };

    const handleMouseUp = () => {
      // Nếu kéo đủ xa (hơn 80px) và chưa được reveal thì emit action lên server
      const serverRevealedDice = gameState?.revealedDice || [false, false, false];
      if (currentDragY > 80 && draggingIndex !== null && !serverRevealedDice[draggingIndex]) {
        // Emit action lên server - server sẽ broadcast cho tất cả người chơi
        onAction('reveal-dice', { index: draggingIndex });
      }
      
      setDraggingIndex(null);
      setCurrentDragY(0);
      setDragStartY(0);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingIndex, dragStartY, currentDragY, gameState?.revealedDice, onAction]);

  return (
    <div className="taixiu-game">
      {isSpectator && (
        <div className="spectator-banner">
          👁️ Bạn đang xem với tư cách khán giả
        </div>
      )}

      <div className="taixiu-header">
        <h2>🎲 Tài Xỉu - Ván {round}</h2>
        <div className="game-status">
          {status === 'betting' && (
            <>
              <span className="status-badge betting">⚡ Đang đặt cược</span>
              <div className={`countdown-timer ${timeLeft <= 5 ? 'urgent' : ''}`}>
                ⏱️ {timeLeft}s
              </div>
            </>
          )}
          {status === 'rolling' && <span className="status-badge rolling">🎲 Đang tung xúc xắc...</span>}
          {status === 'finished' && !allDiceRevealed && (
            <span className="status-badge waiting-reveal">⏳ Đang chờ reveal kết quả...</span>
          )}
          {status === 'finished' && allDiceRevealed && (
            <span className={`status-badge finished ${result === 'tai' ? 'tai' : 'xiu'}`}>
              {result === 'tai' ? '📈 Tài' : '📉 Xỉu'} - {sum} điểm
            </span>
          )}
        </div>
      </div>

      {/* Khu vực đặt cược */}
      {status === 'betting' && !isSpectator && (
        <div className="betting-area">
          <div className="bet-amount-input">
            <label>Số tiền cược:</label>
            <input
              type="number"
              min="1"
              value={betAmount}
              onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
              placeholder="Nhập số tiền"
            />
          </div>
          
          <div className="bet-buttons">
            <button
              className={`bet-btn tai ${myBet?.choice === 'tai' ? 'selected' : ''} ${timeLeft <= 0 ? 'disabled' : ''}`}
              onClick={() => handlePlaceBet('tai')}
              disabled={timeLeft <= 0}
            >
              <div className="bet-label">📈 TÀI</div>
              <div className="bet-description">(11 - 18 điểm)</div>
              {myBet?.choice === 'tai' && (
                <div className="bet-amount-display">{myBet.amount} đã cược</div>
              )}
            </button>
            
            <button
              className={`bet-btn xiu ${myBet?.choice === 'xiu' ? 'selected' : ''} ${timeLeft <= 0 ? 'disabled' : ''}`}
              onClick={() => handlePlaceBet('xiu')}
              disabled={timeLeft <= 0}
            >
              <div className="bet-label">📉 XỈU</div>
              <div className="bet-description">(3 - 10 điểm)</div>
              {myBet?.choice === 'xiu' && (
                <div className="bet-amount-display">{myBet.amount} đã cược</div>
              )}
            </button>
          </div>

          {myBet && (
            <div className="my-bet-info">
              <p>✅ Bạn đã đặt cược: <strong>{myBet.choice === 'tai' ? 'Tài' : 'Xỉu'}</strong> - {myBet.amount}</p>
              <p className="change-bet-hint">💡 Bạn có thể thay đổi cược trong thời gian còn lại</p>
            </div>
          )}

          <div className="waiting-info">
            <p className="hint">
              {timeLeft > 0 
                ? `⏱️ Xúc xắc sẽ tự động tung sau ${timeLeft} giây...`
                : '🎲 Xúc xắc đang được tung...'}
            </p>
          </div>
        </div>
      )}

      {/* Khu vực hiển thị xúc xắc */}
      {(status === 'rolling' || status === 'finished') && (
        <div className="dice-area">
          <div className="dice-container">
            {dice.map((value, index) => (
              <div key={index} className="dice-wrapper">
                {/* Xúc xắc bên dưới - chỉ hiển thị khi đã reveal hoặc đang rolling */}
                {(status === 'rolling' || localRevealedDice[index]) && (
                  <div className={`dice-under-bowl ${localRevealedDice[index] ? 'revealed' : ''} ${status === 'rolling' ? 'loading' : ''}`}>
                    {value ? (
                      <DiceFace value={value} />
                    ) : (
                      <div className="dice-loading">🎲</div>
                    )}
                  </div>
                )}
                
                {/* Bát che phía trên - chỉ hiển thị khi finished và chưa reveal */}
                {status === 'finished' && !localRevealedDice[index] && (
                  <>
                    {/* Placeholder để giữ không gian cho xúc xắc bên dưới */}
                    <div className="dice-placeholder"></div>
                    <div
                      className={`bowl ${draggingIndex === index ? 'dragging' : ''}`}
                      onMouseDown={(e) => handleMouseDown(e, index)}
                      style={{
                        cursor: draggingIndex === index ? 'grabbing' : 'grab',
                        transform: draggingIndex === index 
                          ? `translateX(-50%) translateY(-${Math.min(150, currentDragY)}px)` 
                          : 'translateX(-50%) translateY(0px)',
                        transition: draggingIndex === index ? 'none' : 'transform 0.3s ease'
                      }}
                    >
                      <div className="bowl-top">🍵</div>
                      <div className="bowl-body"></div>
                      <div className="drag-hint">⬆️ Kéo lên để xem</div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          
          {status === 'finished' && allDiceRevealed && (
            <div className="result-display">
              <div className="result-card">
                <div className={`result-badge ${result === 'tai' ? 'tai' : 'xiu'}`}>
                  {result === 'tai' ? '📈 Tài' : '📉 Xỉu'} - {sum} điểm
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Danh sách người chơi và cược */}
      <div className="players-bets">
        <h3>Người chơi và cược</h3>
        <div className="players-list">
          {players.map(player => {
            const bet = gameState?.bets?.[player.id];
            const won = status === 'finished' && isWinner(player.id);
            return (
              <div
                key={player.id}
                className={`player-bet-item ${player.id === user.id ? 'me' : ''} ${won ? 'winner' : ''}`}
              >
                <div className="player-name">
                  {player.username} {player.id === user.id && '(Bạn)'}
                </div>
                <div className="bet-info">
                  {bet ? (
                    <>
                      <span className={`bet-choice ${bet.choice}`}>
                        {bet.choice === 'tai' ? '📈 Tài' : '📉 Xỉu'}
                      </span>
                      <span className="bet-amount">{bet.amount}</span>
                      {status === 'finished' && allDiceRevealed && (
                        <span className={`result ${won ? 'win' : 'lose'}`}>
                          {won ? '✅ Thắng' : '❌ Thua'}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="no-bet">Chưa đặt cược</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Thông báo tự động bắt đầu ván mới */}
      {status === 'finished' && allDiceRevealed && (
        <div className="auto-new-round-info">
          <p className="auto-new-round-message">
            ⏱️ Ván mới sẽ tự động bắt đầu sau {resultTimeLeft} giây...
          </p>
        </div>
      )}
      
      {/* Thông báo khi chưa reveal hết */}
      {status === 'finished' && !allDiceRevealed && (
        <div className="reveal-hint-info">
          <p className="reveal-hint-message">
            ⬆️ Kéo hết 3 bát lên để xem kết quả và tiếp tục ván mới
          </p>
        </div>
      )}

      {/* Lịch sử các ván */}
      {roundHistory.length > 0 && (
        <div className="round-history">
          <h3>Lịch sử gần đây</h3>
          <div className="history-list">
            {roundHistory.slice().reverse().map((round, index) => (
              <div key={index} className="history-item">
                <span className="history-round">Ván {round.round}</span>
                <span className="history-dice">
                  {round.dice.map((d, idx) => (
                    <span key={idx} className="history-dice-item">
                      <DiceFace value={d} />
                    </span>
                  ))}
                </span>
                <span className="history-sum">{round.sum}</span>
                <span className={`history-result ${round.result}`}>
                  {round.result === 'tai' ? '📈 Tài' : '📉 Xỉu'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TaiXiuGame;

