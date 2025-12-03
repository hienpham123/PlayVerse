# Kế hoạch Triển khai Bot AI cho các Game

## Tổng quan
Thêm chế độ chơi với máy (bot) cho tất cả các game với 3 mức độ khó: **Dễ**, **Trung bình**, **Khó**.

## Cấu trúc Framework

### 1. BotAI.js (Đã tạo)
- Framework chung cho tất cả game
- Hỗ trợ 3 mức độ: easy, medium, hard
- Có sẵn logic cho:
  - Cờ XO
  - Tài Xỉu

### 2. Cần tích hợp vào các game:

#### Game đơn giản (Ưu tiên):
1. ✅ **Cờ XO** - Đã có logic trong BotAI.js
2. ✅ **Tài Xỉu** - Đã có logic trong BotAI.js

#### Game phức tạp (Cần implement):
4. **Cờ vua** - Cần minimax/alpha-beta pruning
5. **Cờ tướng** - Cần minimax/alpha-beta pruning
6. **Cờ vây** - Cần logic phức tạp
7. **Tiến lên** - Cần logic đánh bài thông minh
8. **Sâm lốc** - Cần logic đánh bài thông minh

### 3. Tính năng cần thêm:

#### Backend:
- [x] BotAI.js framework
- [ ] Thêm botDifficulty vào room settings
- [ ] Tự động thêm bot khi không đủ người
- [ ] Logic bot cho từng game
- [ ] Bot tự động chơi khi đến lượt

#### Frontend:
- [ ] UI chọn độ khó bot khi tạo phòng
- [ ] Hiển thị bot trong danh sách người chơi
- [ ] Animation bot đang suy nghĩ

#### Server Logic:
- [ ] Tự động trigger bot move sau player move
- [ ] Handle bot actions trong game flow

## Cách sử dụng:

1. Khi tạo phòng, chọn độ khó bot
2. Nếu không đủ người, hệ thống tự động thêm bot
3. Bot tự động chơi khi đến lượt
4. Bot có thể chơi ở mức dễ/trung bình/khó

## Ghi chú:
- Đây là một feature lớn, cần implement từng game một
- Framework đã sẵn sàng, chỉ cần mở rộng logic cho từng game
- Các game đơn giản (XO, Tài Xỉu) đã có logic cơ bản

