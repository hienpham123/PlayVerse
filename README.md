# 🎮 Game Online

Game Online với ReactJS và Node.js, hỗ trợ nhiều người chơi qua mạng nội bộ. Bao gồm các game: **Tiến lên** và **Phỏm**.

## ✨ Tính năng

- 🎯 Đăng nhập đơn giản với tên người chơi
- 🏠 Lobby để xem và tạo phòng chơi
- 🎴 Hỗ trợ 2 loại game: Tiến lên và Phỏm
- 👥 Multiplayer real-time qua Socket.io
- 📱 Responsive design, hỗ trợ mobile
- 🌐 Chơi được qua mạng nội bộ (cùng WiFi)

## 🚀 Cài đặt và Chạy

### Yêu cầu
- Node.js (v14 trở lên)
- npm hoặc yarn

### Bước 1: Cài đặt dependencies

```bash
npm run install-all
```

Hoặc cài đặt từng phần:

```bash
# Cài đặt root dependencies
npm install

# Cài đặt server dependencies
cd server
npm install

# Cài đặt client dependencies
cd ../client
npm install
```

### Bước 2: Chạy project

**Cách 1: Chạy bằng script tự động (Khuyến nghị)**
- Windows: Double-click vào file `start.bat`
- Hoặc chạy: `.\start.ps1` trong PowerShell

**Cách 2: Chạy cả server và client cùng lúc**
```bash
npm run dev
```

**Cách 3: Chạy riêng biệt**

Terminal 1 - Server (port 2023):
```bash
npm run server
```

Terminal 2 - Client (port 1999):
```bash
npm run client
```

### Bước 3: Tìm địa chỉ IP (để chơi từ thiết bị khác)

Chạy lệnh để xem IP của máy chủ:
```bash
npm run get-ip
```

Hoặc xem file `SETUP.md` để biết cách tìm IP thủ công.

### Bước 4: Cấu hình cho mạng nội bộ

Tạo file `.env` trong thư mục `client/`:
```env
REACT_APP_SOCKET_URL=http://YOUR_IP:3001
REACT_APP_API_URL=http://YOUR_IP:3001/api
```

Thay `YOUR_IP` bằng địa chỉ IP từ bước 3 (ví dụ: `192.168.1.100`)

### Bước 5: Truy cập game

- **Trên máy chủ**: Mở trình duyệt và vào `http://localhost:1999`
- **Từ thiết bị khác trong cùng WiFi**: Mở trình duyệt và vào `http://YOUR_IP:1999`

**Lưu ý**: 
- Server chạy trên port **2023**
- Client chạy trên port **1999**
- Đảm bảo firewall cho phép kết nối trên port 1999 và 2023
- Xem file `SETUP.md` hoặc `HUONG_DAN_CHAY.txt` để biết chi tiết

## 📁 Cấu trúc Project

```
game-bai/
├── server/                 # Backend server
│   ├── index.js           # Server chính
│   ├── auth/              # Authentication
│   │   └── AuthManager.js
│   └── game/              # Game logic
│       ├── GameManager.js
│       └── games/
│           ├── TienLenGame.js
│           └── PhomGame.js
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── Login.js
│   │   │   ├── Lobby.js
│   │   │   ├── GameRoom.js
│   │   │   └── Card.js
│   │   ├── services/      # API và Socket services
│   │   └── App.js
│   └── public/
└── package.json
```

## 🎮 Cách chơi

### Tiến lên
- Mỗi người chơi nhận 13 lá bài
- Người chơi đánh bài theo lượt
- Phải đánh bài cao hơn lượt trước hoặc bỏ lượt
- Người hết bài trước thắng

### Phỏm
- Mỗi người chơi nhận 9 lá bài
- Rút bài từ bộ bài hoặc đống bài bỏ
- Tạo phỏm (3+ lá cùng chất hoặc sảnh)
- Bỏ bài không cần thiết
- Người hết bài trước thắng

## 🔧 Cấu hình

### Thay đổi port

**Server** (mặc định: 3001):
- Sửa trong `server/index.js`: `const PORT = process.env.PORT || 3001;`

**Client** (mặc định: 3000):
- Tạo file `.env` trong thư mục `client/`:
```
PORT=3000
REACT_APP_SOCKET_URL=http://YOUR_IP:3001
REACT_APP_API_URL=http://YOUR_IP:3001/api
```

## 🛠️ Công nghệ sử dụng

- **Frontend**: React, Socket.io-client
- **Backend**: Node.js, Express, Socket.io
- **Real-time**: WebSocket (Socket.io)

## 🌐 Deploy lên Mạng

Bạn muốn deploy ứng dụng lên mạng để mọi người vào chơi cùng?

👉 **Xem hướng dẫn deploy chi tiết**: [DEPLOY.md](./DEPLOY.md)

**Tóm tắt nhanh**:
- Frontend: Deploy lên Netlify (miễn phí)
- Backend: Deploy lên Render.com (miễn phí)

Hoặc xem file `QUICK_START_DEPLOY.txt` để có hướng dẫn nhanh nhất!

## 📝 License

MIT

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Hãy tạo issue hoặc pull request.

---

Chúc bạn chơi game vui vẻ! 🎉

