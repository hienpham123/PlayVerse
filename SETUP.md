# Hướng dẫn Setup Game Bài Online

## Bước 1: Cài đặt Dependencies

```bash
npm run install-all
```

## Bước 2: Tìm địa chỉ IP của máy chủ

### Trên Windows:
1. Mở Command Prompt hoặc PowerShell
2. Gõ lệnh: `ipconfig`
3. Tìm dòng "IPv4 Address" trong phần "Wireless LAN adapter Wi-Fi" hoặc "Ethernet adapter"
4. Ghi nhớ địa chỉ IP (ví dụ: `192.168.1.100`)

### Trên Mac/Linux:
1. Mở Terminal
2. Gõ lệnh: `ifconfig` hoặc `ip addr`
3. Tìm địa chỉ IP trong phần wlan0 hoặc eth0

## Bước 3: Cấu hình cho mạng nội bộ

### Cách 1: Sử dụng biến môi trường (Khuyến nghị)

1. Tạo file `.env` trong thư mục `client/`:
```env
REACT_APP_SOCKET_URL=http://YOUR_IP:3001
REACT_APP_API_URL=http://YOUR_IP:3001/api
```

Thay `YOUR_IP` bằng địa chỉ IP của máy chủ (ví dụ: `192.168.1.100`)

2. Khởi động lại client sau khi thay đổi `.env`

### Cách 2: Sửa trực tiếp trong code

Sửa file `client/src/services/socket.js`:
```javascript
const SOCKET_URL = 'http://YOUR_IP:3001';
```

Sửa file `client/src/services/api.js`:
```javascript
const API_URL = 'http://YOUR_IP:3001/api';
```

## Bước 4: Mở Firewall (Windows)

1. Mở Windows Defender Firewall
2. Chọn "Allow an app or feature through Windows Defender Firewall"
3. Tìm và bật "Node.js" cho cả Private và Public networks
4. Hoặc tạo rule mới cho port 3000 và 3001

## Bước 5: Chạy Server và Client

```bash
npm run dev
```

Hoặc chạy riêng biệt:

**Terminal 1:**
```bash
npm run server
```

**Terminal 2:**
```bash
npm run client
```

## Bước 6: Truy cập Game

- **Trên máy chủ**: `http://localhost:3000`
- **Từ thiết bị khác**: `http://YOUR_IP:3000`

## Troubleshooting

### Không kết nối được từ thiết bị khác:
1. Kiểm tra cả hai thiết bị đều trong cùng WiFi
2. Kiểm tra firewall đã mở port 3000 và 3001
3. Kiểm tra địa chỉ IP đã đúng chưa
4. Thử ping từ thiết bị khác: `ping YOUR_IP`

### Lỗi CORS:
- Đảm bảo server đang chạy trên `0.0.0.0` (đã cấu hình sẵn)
- Kiểm tra file `server/index.js` có `cors()` middleware

### Socket không kết nối:
- Kiểm tra `REACT_APP_SOCKET_URL` trong `.env` đã đúng chưa
- Kiểm tra server đang chạy trên port 3001
- Mở Developer Tools (F12) và xem Console để kiểm tra lỗi

