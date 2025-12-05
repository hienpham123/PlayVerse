# 🚀 Hướng dẫn Deploy Nhanh

## 📦 Chuẩn bị

1. **Push code lên GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Ready for deploy"
   git remote add origin https://github.com/username/your-repo.git
   git push -u origin main
   ```

---

## 🔙 Backend - Render.com

1. Vào https://render.com → Sign up với GitHub
2. "New +" → "Web Service"
3. Chọn repo GitHub của bạn
4. Điền:
   - **Name**: `game-bai-backend`
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Environment Variables**: 
     - `PORT=10000`
     - `NODE_ENV=production`
5. Click "Create Web Service"
6. Chờ deploy xong → Copy URL (ví dụ: `https://game-bai-backend.onrender.com`)

---

## 🎨 Frontend - Netlify

1. Vào https://netlify.com → Sign up với GitHub
2. "Add new site" → "Import an existing project"
3. Chọn repo GitHub
4. Điền:
   - **Base directory**: `client`
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `client/build`
5. **Environment Variables**:
   - `REACT_APP_SOCKET_URL=https://game-bai-backend.onrender.com` (thay bằng URL backend của bạn)
6. Click "Deploy site"
7. Chờ deploy xong → Copy URL (ví dụ: `https://awesome-game.netlify.app`)

---

## ✅ Xong!

Chia sẻ URL Netlify với mọi người để cùng chơi! 🎉

**Lưu ý**: Render free tier có thể "sleep" sau 15 phút. Lần đầu truy cập sẽ mất 30-60 giây để "wake up".

---

Chi tiết đầy đủ xem file `DEPLOY.md`

