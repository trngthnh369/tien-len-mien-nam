# 01 – PLANNING CONTEXT

## 1.1 Problem & Goals

**Problem:** Cần một web app chơi bài Tiến Lên Miền Nam cho 4 người,
real-time, có auth, lobby, phòng chờ, và phòng chơi với giao diện
lá bài đẹp, dark mode, không gradient.

**Primary Goals:**

1. Người dùng đăng ký / đăng nhập bằng username + password
2. Tạo phòng / tham gia phòng qua invite link hoặc room code
3. Chơi Tiến Lên Miền Nam đúng luật: đánh tranh nhất/nhì/ba/bét
4. Chat + thả cảm xúc realtime trong phòng
5. Lưu lịch sử thứ hạng từng ván trong phòng
6. Màn hình tổng hợp sau khi kết thúc ván

**Hard Constraints:**

- Không có hệ thống điểm / số dư / tiền
- Chỉ 4 người chơi mỗi phòng
- Dark mode only, không dùng gradient
- Responsive (mobile + desktop)
- Không cần xác thực email (đăng ký ngay là chơi được)

---

## 1.2 High-level Data Flow

```
[User] → [Auth] → [Lobby] → [Room Lobby (Phòng Chờ)] → [Game Room (Phòng Chơi)]
                     ↑                                            ↓
                [Socket.io]                          [Game Engine (Server-side)]
                     ↑                                            ↓
                [Redis PubSub]                       [PostgreSQL (persist)]
```

**Notes:** Game state được giữ trên server (NestJS + Redis).
Client chỉ nhận state qua socket events, không tự tính toán logic game.

---

## 1.3 Control Flow

- **Trigger:** User gửi action (đánh bài, pass, chat, thả emoji)
- **Decision:**
  - Có phải lượt của user không? (validate server-side)
  - Bộ bài có hợp lệ theo luật Tiến Lên không?
  - Có mạnh hơn bộ bài trên bàn không?
- **Action:**
  - Nếu hợp lệ: cập nhật game state, broadcast cho 4 players
  - Nếu không hợp lệ: trả về error chỉ cho user đó

---

## 1.4 Decomposition Strategy

**Strategy:** Phân rã theo Domain (DDD-lite)

5 Domain chính:

1. **Auth Domain** — Đăng ký, đăng nhập, session
2. **Room Domain** — Tạo/tham gia/quản lý phòng
3. **Game Domain** — Game engine, luật Tiến Lên, turn management
4. **Social Domain** — Chat, emoji reactions
5. **History Domain** — Lưu kết quả ván, tổng hợp

**Reasoning:** Mỗi domain độc lập, dễ assign agent riêng, dễ test.

---

## 1.5 Edge Cases (Planning Level)

- User mất kết nối giữa chừng → phòng chờ reconnect 30s,
  nếu quá hạn → player bị đánh dấu "disconnected", các player khác
  có thể vote kick hoặc chờ
- Browser refresh trong game → rejoin qua session token
- Room host disconnect → chuyển host cho player tiếp theo trong danh sách
- Tất cả pass → người đánh cuối cùng thắng lượt đó
- Người chơi đánh hết bài → xếp hạng 1,2,3,4 theo thứ tự hết bài
