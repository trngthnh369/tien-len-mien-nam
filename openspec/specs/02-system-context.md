# 02 – SYSTEM CONTEXT

## 2.1 System Definition

**System Name:** TienLen.io (Tiến Lên Miền Nam Web Game)
**Purpose:** Web application cho phép 4 người chơi bài Tiến Lên Miền Nam
real-time, không cần cài đặt, có phòng riêng và theo dõi lịch sử ván đấu.

---

## 2.2 Scope

**The system DOES handle:**

- Đăng ký / đăng nhập bằng username + password (bcrypt hash)
- Tạo phòng với room code 6 ký tự, tối đa 4 người
- Mời người chơi qua shareable link `/?room=XXXXXX`
- Lobby: hiển thị danh sách phòng đang tìm người
- Phòng chờ: 4 slots player, host có nút bắt đầu khi đủ 4 người
- Game engine Tiến Lên Miền Nam đúng luật (chi tiết tại Bước 5)
- Chat text và 8 loại emoji reaction realtime trong phòng
- Xếp hạng nhất/nhì/ba/bét sau mỗi ván
- Lịch sử tất cả các ván trong 1 phòng (room session)
- Màn hình tổng kết sau khi kết thúc ván
- Reconnect tự động nếu mất kết nối < 30 giây

**The system DOES NOT handle:**

- Thanh toán, tiền, điểm, tài sản ảo
- Email verification / forgot password
- Xác thực OAuth (Google, Facebook)
- Tournament / giải đấu
- Spectator mode
- Mobile app native (chỉ mobile web)
- Lưu replay đầy đủ của ván đấu
- AI / bot player

---

## 2.3 Constraints

**Performance Constraints:**

- Socket event latency < 100ms (local network)
- Game state update broadcast < 200ms
- API response time < 300ms (P95)
- Hỗ trợ tối đa 100 phòng đồng thời (400 users)

**Security Constraints:**

- JWT access token (15 phút) + refresh token (7 ngày)
- Game action validation 100% server-side (không tin client)
- Room code không đoán được (nanoid 6 ký tự alphanumeric)
- Rate limit: 60 socket events/phút/user

**Functional Constraints:**

- Game state được serialize vào Redis (TTL 4 giờ)
- Kết quả ván được persist vào PostgreSQL ngay khi ván kết thúc
- Một user chỉ có thể ở trong 1 phòng tại 1 thời điểm
