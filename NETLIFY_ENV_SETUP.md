# 🔧 Cấu hình Environment Variables trên Netlify

## ⚠️ Vấn đề hiện tại

Frontend đang kết nối tới `http://localhost:2023` thay vì backend trên Render, dẫn đến lỗi đăng nhập.

## ✅ Giải pháp

Bạn cần cấu hình Environment Variables trên Netlify để frontend biết kết nối tới backend nào.

---

## 📝 Các bước thực hiện:

### 1. Vào Netlify Dashboard

1. Đăng nhập vào https://app.netlify.com
2. Chọn site của bạn (ví dụ: `he-ho-playverse`)

### 2. Vào Site Settings

1. Click vào **"Site settings"** (hoặc icon ⚙️)
2. Trong menu bên trái, click **"Environment variables"**

### 3. Thêm Environment Variables

Click **"Add a variable"** và thêm 2 biến sau:

#### Biến 1: REACT_APP_SOCKET_URL
- **Key**: `REACT_APP_SOCKET_URL`
- **Value**: `https://playverse-backend-trih.onrender.com`
  (Thay bằng URL backend Render của bạn)

#### Biến 2: REACT_APP_API_URL (Optional - sẽ tự động suy ra từ SOCKET_URL)
- **Key**: `REACT_APP_API_URL`
- **Value**: `https://playverse-backend-trih.onrender.com/api`
  (Thay bằng URL backend Render của bạn + `/api`)

### 4. Save và Redeploy

1. Click **"Save"**
2. Vào **"Deploys"** tab
3. Click **"Trigger deploy"** → **"Clear cache and deploy site"**
4. Chờ deploy xong (khoảng 3-5 phút)

---

## 🎯 Sau khi deploy xong:

1. Refresh trang Netlify của bạn
2. Thử đăng nhập lại
3. Nếu vẫn lỗi, kiểm tra Console (F12) xem có lỗi gì

---

## 🔍 Kiểm tra Environment Variables đã được áp dụng chưa:

1. Vào Netlify Dashboard → Deploys
2. Click vào deploy mới nhất
3. Xem build log, tìm dòng có `REACT_APP_SOCKET_URL`
4. Hoặc vào Browser Console và chạy:
   ```javascript
   console.log(process.env.REACT_APP_SOCKET_URL);
   ```

---

## ⚠️ Lưu ý quan trọng:

- Environment variables chỉ có hiệu lực sau khi **rebuild**
- Phải **"Clear cache and deploy site"** để đảm bảo biến mới được áp dụng
- Nếu vẫn không work, kiểm tra lại URL backend trên Render có đúng không

---

## 🔗 URL Backend của bạn:

Dựa trên hình ảnh Render dashboard:
- **Backend URL**: `https://playverse-backend-trih.onrender.com`
- **API URL**: `https://playverse-backend-trih.onrender.com/api`

---

Sau khi cấu hình xong, frontend sẽ tự động kết nối tới backend trên Render thay vì localhost! 🎉

