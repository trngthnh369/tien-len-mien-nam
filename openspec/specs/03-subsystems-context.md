# 03 – SUBSYSTEMS CONTEXT

## 3.1 Subsystem List

- **Subsystem A:** Frontend (Next.js 14)
- **Subsystem B:** API Gateway (NestJS REST)
- **Subsystem C:** Realtime Engine (NestJS + Socket.io)
- **Subsystem D:** Game Core (Pure TypeScript Logic)
- **Subsystem E:** Data Layer (PostgreSQL + Redis)

---

## 3.2 Subsystem Context Details

### Subsystem A: Frontend (Next.js 14)

**Purpose:** Giao diện người dùng — 8 màn hình chính (thiết kế từ Google Stitch).
**Boundary:**

- Input: User interactions (click, drag lá bài), socket events từ server
- Output: HTTP requests tới API Gateway, socket emissions tới Realtime Engine

**Responsibilities:**

- Render UI responsive dark-mode (TailwindCSS + Plus Jakarta Sans)
- Quản lý client-side game state (Zustand store)
- Hiển thị lá bài theo thiết kế từ Stitch
- Animation khi đánh bài, xếp hạng

**Dependencies:** Subsystem B (REST), Subsystem C (Socket.io)

**Design Source:** Stitch Project ID 2960647651702440815

---

### Subsystem B: API Gateway (NestJS REST)

**Purpose:** Xử lý các request không cần realtime (auth, room management, history).
**Boundary:**

- Input: HTTP requests từ Frontend
- Output: JSON responses, ghi vào PostgreSQL

**Responsibilities:**

- Auth (register, login, refresh token, logout)
- CRUD phòng (tạo, lấy danh sách, lấy chi tiết)
- Lấy lịch sử ván đấu trong phòng

**Dependencies:** Subsystem E (PostgreSQL)

---

### Subsystem C: Realtime Engine (NestJS + Socket.io)

**Purpose:** Xử lý toàn bộ tương tác real-time trong game.
**Boundary:**

- Input: Socket events từ clients (joinRoom, playCards, chat, emoji, pass)
- Output: Broadcast state updates tới tất cả players trong phòng

**Responsibilities:**

- Namespace `/room` cho phòng chờ, `/game` cho phòng chơi
- Xác thực JWT khi handshake socket
- Gọi Game Core để validate và xử lý actions
- Sync game state qua Redis
- Xử lý disconnect / reconnect

**Dependencies:** Subsystem D (Game Core), Subsystem E (Redis)

---

### Subsystem D: Game Core (Pure TypeScript)

**Purpose:** Toàn bộ logic Tiến Lên Miền Nam — độc lập hoàn toàn, không có I/O.
**Boundary:**

- Input: Hàm thuần túy nhận game state + action
- Output: New game state hoặc error

**Responsibilities:**

- Chia bài (52 lá, 13 lá/người)
- Xác định người đánh đầu (3 bích hoặc player thắng ván trước)
- Validate bộ bài hợp lệ (đơn, đôi, ba, sảnh, tứ quý, đôi thông, ba đôi thông)
- So sánh bộ bài (mạnh/yếu)
- Xử lý chặt (cut) bằng tứ quý hoặc đôi thông
- Xác định kết thúc ván, xếp hạng

**Dependencies:** Không có (pure functions)

---

### Subsystem E: Data Layer

**Purpose:** Lưu trữ persistent data (PostgreSQL) và ephemeral state (Redis).
**Boundary:**

- Input: Read/write từ Subsystem B và C
- Output: Data cho các subsystem trên

**Responsibilities:**

- PostgreSQL: users, rooms, game_sessions, game_results, messages
- Redis: game state hiện tại (key: `game:{roomId}`), socket session mapping

**Dependencies:** Không có
