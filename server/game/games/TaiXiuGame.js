class TaiXiuGame {
  constructor(players, hostId) {
    this.players = players;
    this.hostId = hostId;
    this.status = 'betting'; // betting, rolling, finished
    this.bets = {}; // {playerId: {choice: 'tai'|'xiu', amount: number}}
    this.dice = [null, null, null]; // 3 xúc xắc
    this.sum = null; // Tổng điểm
    this.result = null; // 'tai' hoặc 'xiu'
    this.winners = []; // Danh sách người thắng
    this.round = 1;
    this.roundHistory = []; // Lịch sử các ván
    this.bettingTimeLeft = 20; // Thời gian còn lại để đặt cược (giây)
    this.bettingStartTime = Date.now(); // Thời điểm bắt đầu đặt cược
    this.finishedStartTime = null; // Thời điểm bắt đầu hiển thị kết quả
    this.resultDisplayTime = 5; // Thời gian hiển thị kết quả (giây) trước khi bắt đầu ván mới
    this.allDiceRevealed = false; // Tất cả 3 xúc xắc đã được reveal chưa
    this.revealedDice = [false, false, false]; // Track từng xúc xắc đã được reveal
  }

  getStateForPlayer(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    const isSpectator = playerIndex === -1;
    
    // Tính thời gian còn lại
    let timeLeft = 0;
    if (this.status === 'betting') {
      const elapsed = Math.floor((Date.now() - this.bettingStartTime) / 1000);
      timeLeft = Math.max(0, this.bettingTimeLeft - elapsed);
    }
    
    return {
      status: this.status,
      bets: this.bets,
      myBet: this.bets[playerId] || null,
      dice: this.dice,
      sum: this.sum,
      result: this.result,
      winners: this.winners,
      round: this.round,
      roundHistory: this.roundHistory.slice(-10), // Chỉ gửi 10 ván gần nhất
      players: this.players.map(p => ({
        id: p.id,
        username: p.username,
        hasBet: !!this.bets[p.id]
      })),
      isSpectator,
      bettingTimeLeft: timeLeft,
      hostId: this.hostId,
      finishedStartTime: this.finishedStartTime 
        ? (this.finishedStartTime instanceof Date ? this.finishedStartTime.toISOString() : this.finishedStartTime)
        : null,
      resultDisplayTime: this.resultDisplayTime,
      allDiceRevealed: this.allDiceRevealed,
      revealedDice: [...this.revealedDice]
    };
  }

  handleAction(playerId, action, data) {
    switch (action) {
      case 'place-bet':
        return this.placeBet(playerId, data.choice, data.amount);
      case 'new-round':
        return this.newRound(playerId);
      case 'reveal-dice':
        return this.revealDice(playerId, data.index);
      default:
        return { success: false, error: 'Hành động không hợp lệ' };
    }
  }

  placeBet(playerId, choice, amount) {
    if (this.status !== 'betting') {
      return { success: false, error: 'Không trong giai đoạn đặt cược' };
    }

    // Kiểm tra thời gian còn lại
    const elapsed = Math.floor((Date.now() - this.bettingStartTime) / 1000);
    const timeLeft = this.bettingTimeLeft - elapsed;
    if (timeLeft <= 0) {
      return { success: false, error: 'Hết thời gian đặt cược' };
    }

    if (choice !== 'tai' && choice !== 'xiu') {
      return { success: false, error: 'Lựa chọn không hợp lệ. Chọn Tài hoặc Xỉu' };
    }

    if (!amount || amount <= 0) {
      return { success: false, error: 'Số tiền cược phải lớn hơn 0' };
    }

    // Cho phép thay đổi cược (cập nhật lại)
    this.bets[playerId] = {
      choice,
      amount: amount
    };

    return { 
      success: true, 
      data: { 
        bet: this.bets[playerId],
        message: `Đã đặt cược ${amount} vào ${choice === 'tai' ? 'Tài' : 'Xỉu'}`
      } 
    };
  }

  _performRoll() {
    // Vẫn roll dice ngay cả khi không có ai đặt cược để game tiếp tục
    this.status = 'rolling';
    
    // Tung 3 xúc xắc
    this.dice = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1
    ];

    // Tính tổng
    this.sum = this.dice[0] + this.dice[1] + this.dice[2];

    // Xác định kết quả
    this.result = this.sum > 10 ? 'tai' : 'xiu';

    // Tìm người thắng (chỉ nếu có người đặt cược)
    this.winners = [];
    Object.keys(this.bets).forEach(betPlayerId => {
      if (this.bets[betPlayerId].choice === this.result) {
        this.winners.push({
          playerId: betPlayerId,
          amount: this.bets[betPlayerId].amount
        });
      }
    });

    // Chuyển sang trạng thái finished
    this.status = 'finished';
    this.finishedStartTime = null; // Chỉ set khi tất cả xúc xắc được reveal
    this.allDiceRevealed = false;
    this.revealedDice = [false, false, false]; // Reset trạng thái revealed

    // Lưu vào lịch sử
    this.roundHistory.push({
      round: this.round,
      dice: [...this.dice],
      sum: this.sum,
      result: this.result,
      bets: {...this.bets},
      winners: [...this.winners]
    });

    const message = Object.keys(this.bets).length === 0
      ? `Kết quả: ${this.sum} điểm (${this.result === 'tai' ? 'Tài' : 'Xỉu'}) - Không có ai đặt cược`
      : `Kết quả: ${this.sum} điểm (${this.result === 'tai' ? 'Tài' : 'Xỉu'})`;

    return { 
      success: true, 
      data: { 
        dice: this.dice,
        sum: this.sum,
        result: this.result,
        winners: this.winners,
        message: message
      } 
    };
  }

  newRound(playerId) {
    if (this.status !== 'finished') {
      return { success: false, error: 'Ván chưa kết thúc' };
    }

    // Reset cho ván mới
    this.status = 'betting';
    this.bets = {};
    this.dice = [null, null, null];
    this.sum = null;
    this.result = null;
    this.winners = [];
    this.round += 1;
    this.bettingTimeLeft = 20;
    this.bettingStartTime = Date.now();
    this.finishedStartTime = null;
    this.allDiceRevealed = false;
    this.revealedDice = [false, false, false];

    return { 
      success: true, 
      data: { 
        message: `Bắt đầu ván ${this.round}`,
        round: this.round
      } 
    };
  }

  revealDice(playerId, index) {
    if (this.status !== 'finished') {
      return { success: false, error: 'Không trong giai đoạn hiển thị kết quả' };
    }

    if (index < 0 || index > 2) {
      return { success: false, error: 'Chỉ số xúc xắc không hợp lệ' };
    }

    // Nếu đã reveal hết 3 xúc xắc rồi thì không làm gì
    if (this.allDiceRevealed) {
      return { success: true, data: { message: 'Tất cả xúc xắc đã được reveal', revealedDice: [...this.revealedDice] } };
    }

    // Đánh dấu xúc xắc này đã được reveal (nếu chưa)
    if (!this.revealedDice[index]) {
      this.revealedDice[index] = true;
      
      // Kiểm tra xem đã reveal hết 3 xúc xắc chưa
      const allRevealed = this.revealedDice.every(revealed => revealed === true);
      if (allRevealed) {
        this.allDiceRevealed = true;
        this.finishedStartTime = new Date(); // Bắt đầu countdown để tự động bắt đầu ván mới
      }
    }

    return { 
      success: true, 
      data: { 
        revealedDice: [...this.revealedDice],
        allDiceRevealed: this.allDiceRevealed,
        message: `Đã reveal xúc xắc ${index + 1}`
      } 
    };
  }

  // Hàm để tự động tung xúc xắc khi hết thời gian (được gọi từ bên ngoài)
  checkAndAutoRoll() {
    if (this.status === 'betting') {
      const elapsed = Math.floor((Date.now() - this.bettingStartTime) / 1000);
      if (elapsed >= this.bettingTimeLeft) {
        const result = this._performRoll();
        return result;
      }
    }
    return null;
  }

  // Hàm để tự động bắt đầu ván mới sau khi hiển thị kết quả
  checkAndAutoNewRound() {
    // Chỉ tự động bắt đầu ván mới khi TẤT CẢ xúc xắc đã được reveal
    if (this.status === 'finished' && this.allDiceRevealed && this.finishedStartTime) {
      const finishedTime = this.finishedStartTime instanceof Date 
        ? this.finishedStartTime.getTime() 
        : new Date(this.finishedStartTime).getTime();
      const elapsed = Math.floor((Date.now() - finishedTime) / 1000);
      if (elapsed >= this.resultDisplayTime) {
        // Tự động bắt đầu ván mới
        this.status = 'betting';
        this.bets = {};
        this.dice = [null, null, null];
        this.sum = null;
        this.result = null;
        this.winners = [];
        this.round += 1;
        this.bettingTimeLeft = 20;
        this.bettingStartTime = Date.now();
        this.finishedStartTime = null;
        this.allDiceRevealed = false;
        this.revealedDice = [false, false, false];

        return { 
          success: true, 
          data: { 
            message: `Bắt đầu ván ${this.round}`,
            round: this.round,
            autoStarted: true
          } 
        };
      }
    }
    return null;
  }
}

module.exports = TaiXiuGame;

