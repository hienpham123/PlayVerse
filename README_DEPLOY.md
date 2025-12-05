# 🌐 Deploy Game Online lên Mạng

## 📝 Tóm tắt

Ứng dụng này có thể được deploy lên mạng để mọi người vào chơi cùng:

- ✅ **Frontend (React)**: Netlify (miễn phí, ổn định)
- ✅ **Backend (Node.js + Socket.io)**: Render.com (miễn phí, hỗ trợ WebSocket)

## 🚀 Các bước chính

### 1. Chuẩn bị code
- Push code lên GitHub repository

### 2. Deploy Backend (Render.com)
- Tạo Web Service trên Render
- Root directory: `server`
- Start command: `node index.js`
- Environment: `PORT=10000`, `NODE_ENV=production`

### 3. Deploy Frontend (Netlify)
- Import project từ GitHub
- Base directory: `client`
- Build command: `npm install && npm run build`
- Environment: `REACT_APP_SOCKET_URL=<backend-url>`

## 📚 Tài liệu chi tiết

- **Hướng dẫn nhanh**: Xem `DEPLOY_QUICK.md`
- **Hướng dẫn đầy đủ**: Xem `DEPLOY.md`

## 🔗 Link hữu ích

- Netlify: https://netlify.com
- Render.com: https://render.com
- GitHub: https://github.com

## ⚠️ Lưu ý

- Render free tier có thể "sleep" sau 15 phút không dùng
- Lần đầu truy cập sau khi sleep sẽ mất 30-60 giây để "wake up"
- Để production thực sự, nên dùng paid plan hoặc VPS

---

Sau khi deploy xong, bạn sẽ có URL công khai để chia sẻ với mọi người! 🎉

