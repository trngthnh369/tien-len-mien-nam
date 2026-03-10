# 04 – MODULES CONTEXT

## 4.1 Modules Per Subsystem

**Frontend:**

- AuthModule (trang login/register)
- LobbyModule (sảnh chờ, danh sách phòng)
- RoomLobbyModule (phòng chờ, 4 slots player)
- GameModule (phòng chơi — bàn bài, tay bài, actions)
- ChatModule (chat + emoji overlay)
- HistoryModule (lịch sử ván, màn hình tổng kết)
- CardRendererModule (render lá bài)

**API Gateway:**

- AuthModule (register, login, refresh, logout)
- RoomsModule (CRUD rooms, invite link)
- HistoryModule (game sessions, results)

**Realtime Engine:**

- RoomGateway (phòng chờ events)
- GameGateway (game events)
- ChatGateway (chat + emoji)

**Game Core:**

- DeckModule (tạo và chia bài)
- HandEvaluatorModule (phân loại bộ bài)
- GameRulesModule (validate, so sánh, chặt)
- GameStateModule (cập nhật và serialize state)

---

## 4.2 Module Context Details

### Module: GameRulesModule (Game Core)

**Belongs to:** Game Core
**Primary Responsibility:** Validate và so sánh bộ bài theo luật Tiến Lên Miền Nam
**Data Ownership:** Không có (pure functions, stateless)
**Module Scope:**

- XỬ LÝ: phân loại bộ bài, so sánh, kiểm tra chặt, xác định lượt hợp lệ
- KHÔNG XỬ LÝ: persist, I/O, UI, socket

**Dependencies:** Không có

---

### Module: GameGateway (Realtime Engine)

**Belongs to:** Realtime Engine
**Primary Responsibility:** Nhận socket events game, validate, dispatch tới Game Core, broadcast kết quả
**Data Ownership:** Đọc/ghi game state trong Redis
**Module Scope:**

- XỬ LÝ: joinGame, playCards, pass, requestEndTurn
- KHÔNG XỬ LÝ: chat (ChatGateway), room management (RoomGateway)

**Dependencies:** GameCore, Redis, PostgreSQL (persist khi ván kết thúc)

---

### Module: GameModule (Frontend)

**Belongs to:** Frontend
**Primary Responsibility:** Render toàn bộ giao diện phòng chơi, quản lý local state
**Data Ownership:** Zustand store: gameState (lá bài, lượt, bàn bài, rankings)
**Module Scope:**

- XỬ LÝ: hiển thị tay bài, bàn bài, chọn lá bài, gửi action
- KHÔNG XỬ LÝ: validate logic game (server-side), chat (ChatModule)

**Dependencies:** Socket.io client, CardRendererModule, ChatModule

---

### Module: CardRendererModule (Frontend)

**Belongs to:** Frontend
**Primary Responsibility:** Render lá bài, hỗ trợ animation
**Data Ownership:** Không có
**Module Scope:**

- XỬ LÝ: render lá bài (mặt trước, mặt sau), highlight, animation đánh bài
- KHÔNG XỬ LÝ: game logic, selection state

**Dependencies:** Không có (pure render component)
