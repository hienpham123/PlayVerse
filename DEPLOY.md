# 🚀 Hướng dẫn Deploy Game Online lên Netlify + Render

Hướng dẫn chi tiết để deploy ứng dụng lên mạng, cho phép mọi người vào chơi cùng.

## 📋 Tổng quan

- **Frontend (React)**: Deploy lên Netlify (miễn phí, tự động build)
- **Backend (Node.js + Socket.io)**: Deploy lên Render.com (miễn phí, hỗ trợ WebSocket)

## 🎯 Bước 1: Chuẩn bị

### 1.1. Cài đặt Git (nếu chưa có)

- Download Git từ: https://git-scm.com/downloads
- Cài đặt và mở Git Bash hoặc Terminal

### 1.2. Khởi tạo Git repository (nếu chưa có)

```bash
cd D:\npm\game-bai
git init
git add .
git commit -m "Initial commit"
```

### 1.3. Tạo repository trên GitHub

1. Vào https://github.com
2. Click "New repository"
3. Đặt tên repo (ví dụ: `game-bai-online`)
4. **KHÔNG** tích "Initialize with README"
5. Click "Create repository"
6. Copy URL của repository (ví dụ: `https://github.com/username/game-bai-online.git`)

### 1.4. Push code lên GitHub

```bash
git remote add origin https://github.com/username/game-bai-online.git
git branch -M main
git push -u origin main
```

---

## 🌐 Bước 2: Deploy Backend lên Render.com

### 2.1. Tạo tài khoản Render.com

1. Vào https://render.com
2. Sign up với GitHub (khuyến nghị) hoặc email

### 2.2. Tạo Web Service mới

1. Trong Dashboard, click "New +" → "Web Service"
2. Chọn repository GitHub của bạn
3. Điền thông tin:
   - **Name**: `game-bai-backend` (hoặc tên khác)
   - **Region**: Singapore (gần Việt Nam nhất)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Instance Type**: Free

4. Trong phần **Environment Variables**, thêm:
   ```
   PORT=10000
   NODE_ENV=production
   ```

5. Click "Create Web Service"

### 2.3. Chờ deploy xong và lấy URL

- Render sẽ tự động build và deploy
- Khi xong, bạn sẽ có URL như: `https://game-bai-backend.onrender.com`
- **Lưu ý**: Render free tier có thể mất 30-60 giây để "wake up" lần đầu sau khi idle

### 2.4. Copy URL backend

Lưu lại URL backend (ví dụ: `https://game-bai-backend.onrender.com`)

---

## 🎨 Bước 3: Deploy Frontend lên Netlify

### 3.1. Tạo tài khoản Netlify

1. Vào https://netlify.com
2. Sign up với GitHub (khuyến nghị)

### 3.2. Tạo Site mới

1. Trong Dashboard, click "Add new site" → "Import an existing project"
2. Chọn "Deploy with GitHub"
3. Chọn repository của bạn
4. Điền cấu hình:
   - **Base directory**: `client`
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `client/build`

### 3.3. Thêm Environment Variables

1. Vào "Site settings" → "Environment variables"
2. Thêm biến:
   ```
   REACT_APP_SOCKET_URL=https://game-bai-backend.onrender.com
   ```
   (Thay bằng URL backend thực tế của bạn)

3. Click "Deploy site"

### 3.4. Chờ deploy xong

- Netlify sẽ tự động build và deploy
- Khi xong, bạn sẽ có URL như: `https://random-name-123.netlify.app`
- Bạn có thể đổi tên trong "Site settings" → "Change site name"

---

## 🔧 Bước 4: Cấu hình CORS và Socket.io

### 4.1. Cập nhật CORS trong server/index.js

Mở file `server/index.js` và tìm dòng CORS, cập nhật để cho phép Netlify domain:

```javascript
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*", // Cho phép tất cả hoặc chỉ Netlify URL
    methods: ["GET", "POST"],
    credentials: true
  }
});
```

### 4.2. Thêm Environment Variable cho Backend

Trong Render.com, vào Web Service → Environment, thêm:
```
FRONTEND_URL=https://your-netlify-app.netlify.app
```

### 4.3. Redeploy Backend

Sau khi thêm env var, Render sẽ tự động redeploy. Hoặc bạn có thể click "Manual Deploy" → "Deploy latest commit"

---

## ✅ Bước 5: Kiểm tra

1. Mở URL Netlify trong trình duyệt
2. Đăng nhập và tạo phòng
3. Mở thêm một tab/thiết bị khác để test multiplayer
4. Kiểm tra console (F12) xem có lỗi kết nối không

---

## 🔄 Cập nhật code sau này

### Để deploy lại sau khi sửa code:

1. **Commit và push lên GitHub**:
   ```bash
   git add .
   git commit -m "Update game features"
   git push
   ```

2. **Netlify** sẽ tự động deploy khi có commit mới
3. **Render** cũng tự động deploy, hoặc click "Manual Deploy" trong dashboard

---

## 🐛 Xử lý lỗi thường gặp

### Lỗi: "Cannot connect to server"

- Kiểm tra `REACT_APP_SOCKET_URL` trong Netlify Environment Variables đã đúng chưa
- Kiểm tra backend đã chạy chưa (Render có thể đang "sleep")
- Mở URL backend trực tiếp trong browser để test

### Lỗi: "CORS error"

- Kiểm tra CORS settings trong `server/index.js`
- Thêm Netlify URL vào `origin` trong CORS config
- Redeploy backend

### Lỗi: "Build failed" trên Netlify

- Kiểm tra build log trong Netlify dashboard
- Đảm bảo `client/package.json` có script `build`
- Kiểm tra Node version (Netlify dùng Node 18 mặc định)

### Backend bị sleep (Render free tier)

- Render free tier sẽ sleep sau 15 phút không có request
- Lần đầu truy cập sau khi sleep sẽ mất 30-60 giây để "wake up"
- Giải pháp: Upgrade lên paid plan hoặc dùng service khác như Railway.app

---

## 📱 Chia sẻ với mọi người

Sau khi deploy xong, bạn có thể chia sẻ URL Netlify với mọi người để cùng chơi!

**Ví dụ**: `https://game-bai-awesome.netlify.app`

---

## 🔗 Các service thay thế

Nếu Render.com không ổn định, bạn có thể dùng:

1. **Railway.app** (miễn phí có credit, tốt hơn Render)
   - https://railway.app
   - Hỗ trợ WebSocket tốt
   - Auto-deploy từ GitHub

2. **Fly.io** (miễn phí, tốt cho global)
   - https://fly.io
   - Deploy nhanh, ổn định

3. **Heroku** (có phí, nhưng ổn định)
   - https://heroku.com
   - Free tier đã bị gỡ

---

## 📝 Notes

- Netlify free tier rất ổn định, không giới hạn bandwidth
- Render free tier có thể bị sleep, nhưng đủ dùng cho demo/small scale
- Để production thực sự, nên dùng paid plans hoặc VPS

Chúc bạn deploy thành công! 🎉

