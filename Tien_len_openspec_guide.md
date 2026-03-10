# 🃏 Hướng Dẫn Xây Dựng "Tiến Lên Miền Nam" — Quy Trình Một Đập Ăn Luôn

> **Stack:** Next.js 14 · NestJS · Socket.io · PostgreSQL · Redis · TailwindCSS  
> **Công cụ:** Antigravity IDE · ag-kit · OpenSpec  
> **Thiết kế:** Dark Mode · Responsive · No Gradient

---

## PHASE 0 — Setup (Chạy 1 lần)

```bash
mkdir tien-len-game && cd tien-len-game
git init

# Khởi tạo ag-kit (tạo .agent/ với 16 agents)
npx @vudovn/ag-kit init

# Khởi tạo OpenSpec (tạo openspec/ structure)
npm install -g @fission-ai/openspec@latest
openspec init   # Chọn AGENTS.md khi hỏi

# Seed prompt đầu session vào openspec/project.md
```

**Nội dung `openspec/project.md`** (paste vào và commit):

```
# Project: Tiến Lên Miền Nam Web Game
Stack: Next.js 14 (App Router), NestJS, Socket.io, PostgreSQL, Redis, TailwindCSS
Style: Dark mode only. NO gradients. Flat colors, solid borders.
Agent config: GEMINI.md
Specs: openspec/specs/
Changes: openspec/changes/

Rules:
- Đọc spec trước khi viết bất kỳ dòng code nào
- Mọi logic game PHẢI đúng luật Tiến Lên Miền Nam chuẩn
- Real-time qua Socket.io namespaces (không dùng polling)
- DB: snake_case. Code: camelCase
```

---

## BƯỚC 1 — Planning & Reasoning

**File: `openspec/specs/01-planning-context.md`**

```markdown
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
↑ ↓
[Socket.io] [Game Engine (Server-side)]
↑ ↓
[Redis PubSub] [PostgreSQL (persist)]

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
```

---

## BƯỚC 2 — System Context

**File: `openspec/specs/02-system-context.md`**

```markdown
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
```

---

## BƯỚC 3 — Subsystem Decomposition

**File: `openspec/specs/03-subsystems-context.md`**

```markdown
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

**Purpose:** Giao diện người dùng — 3 màn hình chính: Lobby, Phòng Chờ, Phòng Chơi.
**Boundary:**

- Input: User interactions (click, drag lá bài), socket events từ server
- Output: HTTP requests tới API Gateway, socket emissions tới Realtime Engine
  **Responsibilities:**
- Render UI responsive dark-mode (TailwindCSS)
- Quản lý client-side game state (Zustand store)
- Hiển thị lá bài theo thiết kế đẹp (SVG sprites)
- Animation khi đánh bài, xếp hạng
  **Dependencies:** Subsystem B (REST), Subsystem C (Socket.io)

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
```

---

## BƯỚC 4 — Module Decomposition

**File: `openspec/specs/04-modules-context.md`**

```markdown
# 04 – MODULES CONTEXT

## 4.1 Modules Per Subsystem

**Frontend:**

- AuthModule (trang login/register)
- LobbyModule (sảnh chờ, danh sách phòng)
- RoomLobbyModule (phòng chờ, 4 slots player)
- GameModule (phòng chơi — bàn bài, tay bài, actions)
- ChatModule (chat + emoji overlay)
- HistoryModule (lịch sử ván, màn hình tổng kết)
- CardRendererModule (render SVG lá bài)

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
**Primary Responsibility:** Render lá bài bằng SVG, hỗ trợ animation  
**Data Ownership:** Không có  
**Module Scope:**

- XỬ LÝ: render lá bài (mặt trước, mặt sau), highlight, animation đánh bài
- KHÔNG XỬ LÝ: game logic, selection state  
  **Dependencies:** Không có (pure render component)
```

---

## BƯỚC 5 — Module Operation Decomposition _(Quan Trọng Nhất)_

**File: `openspec/specs/05-operations-context.md`**

```markdown
# 05 – OPERATIONS CONTEXT

## 5.1 Operations Per Module

**AuthModule (API):** register, login, refreshToken, logout
**RoomsModule (API):** createRoom, joinRoom, getRoomList, getRoomDetail, leaveRoom
**RoomGateway:** connectRoomLobby, playerReady, startGame, kickPlayer
**GameGateway:** joinGame, playCards, passAction, reconnectGame
**ChatGateway:** sendMessage, sendEmoji
**GameRulesModule:** validateHand, compareHands, checkCut, evaluateWinner
**GameStateModule:** initGameState, applyAction, getNextTurn, finalizeGame
**HistoryModule (API):** getRoomHistory, getSessionDetail

---

## 5.2 Operation Context Details

---

### Operation: register

**Module:** AuthModule (API)
**Business Purpose:** Tạo tài khoản mới, trả về JWT ngay sau đăng ký
**Triggers:** User submit form đăng ký
**Input Context:**

- `username` (string, 3-20 ký tự, unique)
- `password` (string, min 6 ký tự)
  **Output Context:**
- Tạo user mới trong DB
- Trả về `{ accessToken, refreshToken, user: { id, username } }`
  **Dependencies:** PostgreSQL users table, bcrypt, JWT service
  **Business Flow:**

1. Validate username format và length
2. Kiểm tra username đã tồn tại chưa trong DB
3. Hash password bằng bcrypt (saltRounds=10)
4. Insert user mới vào bảng `users`
5. Generate accessToken (JWT, 15 phút) + refreshToken (JWT, 7 ngày)
6. Lưu refreshToken vào bảng `refresh_tokens`
7. Trả về tokens + user info
   **Error / Edge Cases:**

- Username đã tồn tại → 409 Conflict
- Username/password không đúng format → 400 Bad Request

---

### Operation: createRoom

**Module:** RoomsModule (API)
**Business Purpose:** Tạo phòng mới, host tự động được thêm vào phòng
**Triggers:** User click "Tạo Phòng" tại Lobby
**Input Context:**

- `userId` (từ JWT)
- `roomName` (optional, string max 30 ký tự)
  **Output Context:**
- Tạo room record trong DB với status `WAITING`
- Trả về `{ roomId, roomCode, inviteUrl }`
  **Dependencies:** PostgreSQL rooms table, nanoid
  **Business Flow:**

1. Kiểm tra user có đang trong phòng khác không (status != WAITING/PLAYING)
2. Generate `roomCode` bằng nanoid(6) uppercase alphanumeric
3. Insert room vào bảng `rooms` (host=userId, status=WAITING, player_count=1)
4. Insert host vào bảng `room_players` (seat=0, is_host=true)
5. Trả về room info + inviteUrl = `${BASE_URL}/?room=${roomCode}`
   **Error / Edge Cases:**

- User đang trong phòng khác → 409 "Bạn đang trong phòng khác, hãy rời phòng trước"
- roomCode collision (cực hiếm) → retry generate

---

### Operation: connectRoomLobby

**Module:** RoomGateway (Socket.io)
**Business Purpose:** User vào phòng chờ, nhận danh sách player hiện tại, broadcast cho các player khác
**Triggers:** Socket event `room:join` khi user navigate tới `/room/:roomCode`
**Input Context:**

- Socket auth: `{ userId }` (từ JWT đã verify lúc handshake)
- Event payload: `{ roomCode: string }`
  **Output Context:**
- User được add vào Socket.io room namespace
- Broadcast `room:player_joined` tới tất cả player trong phòng
- Emit `room:state` chỉ tới user vừa join (full room state)
  **Dependencies:** PostgreSQL room_players, Redis room session
  **Business Flow:**

1. Query room bằng roomCode, kiểm tra tồn tại và status=WAITING
2. Kiểm tra phòng chưa đủ 4 người
3. Kiểm tra user chưa ở trong phòng này rồi
4. Tìm seat trống (0,1,2,3), assign cho user
5. Update `room_players` trong DB, cập nhật `player_count` trong `rooms`
6. Socket join room `room:{roomId}`
7. Emit `room:state` → user: `{ players: [{seat, userId, username, isHost, isReady}], roomCode }`
8. Broadcast `room:player_joined` → all: `{ seat, userId, username }`
   **Error / Edge Cases:**

- Phòng đủ 4 người → emit `room:error` "Phòng đã đủ người"
- Phòng đang chơi (status=PLAYING) → emit `room:error` "Ván đang diễn ra"
- User đã trong phòng (reconnect) → skip thêm vào DB, chỉ socket join

---

### Operation: playCards

**Module:** GameGateway (Socket.io)
**Business Purpose:** Xử lý player đánh bài, validate luật, cập nhật game state, broadcast
**Triggers:** Socket event `game:play` khi player click Đánh Bài
**Input Context:**

- Socket auth: `{ userId }`
- Event payload: `{ cards: Card[] }` (mảng lá bài được chọn)
  - Card: `{ suit: 'S'|'H'|'D'|'C', rank: '3'|'4'|...'K'|'A'|'2' }`
    **Output Context:**
- Game state được cập nhật (bàn bài mới, lượt chuyển)
- Broadcast `game:state_update` tới 4 players
- Nếu player hết bài: broadcast `game:player_finished`
- Nếu ván kết thúc (3 người hết bài): broadcast `game:over`
  **Dependencies:** GameRulesModule, GameStateModule, Redis, PostgreSQL (khi ván kết thúc)
  **Business Flow:**

1. [Input] Lấy game state từ Redis key `game:{roomId}`
2. [Validate] Kiểm tra đúng lượt của userId
3. [Validate] Kiểm tra các lá bài `cards` có thực sự trong tay userId không
4. [Validate] Gọi `GameRulesModule.validateHand(cards)` → phân loại bộ bài
5. [Validate] Kiểm tra `lastPlayedCards` trên bàn:
   - Nếu bàn trống (lượt mới) → bất kỳ bộ hợp lệ nào đều được
   - Nếu bàn có bài → gọi `GameRulesModule.compareHands(cards, lastPlayedCards)`
   - Kiểm tra chặt (tứ quý chặt 2, đôi thông chặt 2 đôi)
6. [Core] Gọi `GameStateModule.applyAction(state, {type: 'PLAY', userId, cards})`
   - Xóa `cards` khỏi tay userId
   - Cập nhật `lastPlayedCards`, `lastPlayedBy`
   - Reset `passCount = 0`
7. [Core] Kiểm tra tay userId còn bao nhiêu lá:
   - Nếu 0 → thêm vào `finishedOrder`, gán rank (1,2,3,4)
8. [Core] Tính `nextTurn` → `GameStateModule.getNextTurn(state)` (bỏ qua player đã hết bài)
9. [Update] Ghi state mới vào Redis
10. [Update] Nếu ván kết thúc (finishedOrder.length >= 3): gọi `finalizeGame()`
11. [Broadcast] Emit `game:state_update` tới room với partial state (không lộ bài người khác)
    **Error / Edge Cases:**

- Không đúng lượt → emit `game:error` "Chưa đến lượt bạn"
- Bài không hợp lệ (không phải bộ) → emit `game:error` "Bộ bài không hợp lệ"
- Bài không đủ mạnh → emit `game:error` "Bài không đủ mạnh"
- Lá bài không trong tay → emit `game:error` "Bài gian lận"
- Game state không tồn tại trong Redis → emit `game:error` "Phòng không tồn tại"

---

### Operation: validateHand

**Module:** GameRulesModule (Game Core)
**Business Purpose:** Phân loại bộ bài là loại nào theo luật Tiến Lên Miền Nam
**Triggers:** Được gọi bởi GameGateway.playCards()
**Input Context:**

- `cards: Card[]` — mảng 1 đến 12 lá bài
  **Output Context:**
- Trả về `HandType` object: `{ type, cards (sorted), rank, suit }` hoặc `null` nếu không hợp lệ
  **Dependencies:** Không có (pure function)
  **Business Flow:**

1. Nếu 1 lá → SingleCard (rank 3..2, suit S<C<D<H)
2. Nếu 2 lá cùng rank → Pair (đôi)
3. Nếu 3 lá cùng rank → Triple (ba lá)
4. Nếu 4 lá cùng rank → FourOfAKind (tứ quý)
5. Nếu 3-12 lá liên tiếp rank, không có lá 2 → Straight (sảnh, min 3 lá)
6. Nếu 3 đôi liên tiếp → ConsecutivePairs (ba đôi thông)
7. Nếu 4 đôi liên tiếp → ConsecutivePairs (4 đôi thông)
8. Nếu không khớp → return null
   **Error / Edge Cases:**

- Cards empty → null
- Lá 2 (Heo) KHÔNG được dùng trong sảnh
- Tứ quý hoặc ba đôi thông mới được chặt 2

---

### Operation: compareHands

**Module:** GameRulesModule (Game Core)
**Business Purpose:** So sánh 2 bộ bài, trả về bộ nào mạnh hơn
**Triggers:** Được gọi bởi GameGateway.playCards()
**Input Context:**

- `attacker: HandType` — bộ bài đang đánh
- `defender: HandType` — bộ bài đang trên bàn
  **Output Context:**
- Trả về `boolean`: true nếu attacker thắng defender, false nếu không
  **Dependencies:** Không có (pure function)
  **Business Flow:**

1. Nếu khác type: chỉ FourOfAKind chặt được Single2, ConsecutivePairs chặt được Single2/Pair2
2. Nếu cùng type:
   - Cùng số lá: so sánh lá cao nhất (rank trước, suit sau nếu tie)
   - Thứ tự rank: 3<4<5<6<7<8<9<T<J<Q<K<A<2
   - Thứ tự suit: Spade < Club < Diamond < Heart
3. Sảnh: phải cùng số lá, so sánh lá cao nhất
4. Tứ quý: thắng mọi thứ trừ tứ quý to hơn
   **Error / Edge Cases:**

- Khác số lá và không phải chặt → return false
- ConsecutivePairs 3 đôi chỉ chặt Single2, không chặt Pair2 hay 2 khác

---

### Operation: sendMessage

**Module:** ChatGateway (Socket.io)
**Business Purpose:** Gửi tin nhắn text trong phòng, lưu vào DB
**Triggers:** Socket event `chat:message` từ player
**Input Context:**

- Socket auth: `{ userId }`
- Event payload: `{ roomId, content: string }`
  **Output Context:**
- Lưu message vào DB
- Broadcast `chat:new_message` tới toàn phòng
  **Dependencies:** PostgreSQL messages table
  **Business Flow:**

1. Validate content: không rỗng, max 200 ký tự
2. Kiểm tra userId đang trong roomId
3. Insert vào bảng `messages` (`room_id, user_id, content, type='text', created_at`)
4. Broadcast `chat:new_message` → `{ messageId, userId, username, content, type:'text', timestamp }`
   **Error / Edge Cases:**

- Content rỗng → emit `chat:error`
- Content > 200 ký tự → auto truncate hoặc reject
- Rate limit 10 messages/10s → emit `chat:error` "Nhắn tin quá nhanh"

---

### Operation: sendEmoji

**Module:** ChatGateway (Socket.io)
**Business Purpose:** Thả cảm xúc realtime, hiển thị animation ngắn, không lưu DB
**Triggers:** Socket event `chat:emoji` từ player
**Input Context:**

- Socket auth: `{ userId }`
- Event payload: `{ roomId, emojiId: number (1-8) }`
  **Output Context:**
- Broadcast `chat:emoji_reaction` tới toàn phòng (ephemeral, không persist)
  **Dependencies:** Không có (ephemeral)
  **Business Flow:**

1. Validate emojiId ∈ [1..8]
2. Kiểm tra userId trong roomId
3. Broadcast tới room: `{ userId, username, emojiId, timestamp }`
   **Error / Edge Cases:**

- Invalid emojiId → emit `chat:error`
- Rate limit 3 emoji/5s

---

### Operation: finalizeGame

**Module:** GameStateModule (Game Core)
**Business Purpose:** Kết thúc ván đấu, gán xếp hạng, persist kết quả, reset state
**Triggers:** Được gọi bởi GameGateway khi finishedOrder.length >= 3
**Input Context:**

- `gameState: GameState` — state cuối của ván
  **Output Context:**
- Insert `game_sessions` và `game_results` vào PostgreSQL
- Xóa game state khỏi Redis
- Broadcast `game:over` với rankings
  **Dependencies:** PostgreSQL, Redis
  **Business Flow:**

1. Player thứ 4 (người cuối còn bài) tự động bét (rank 4)
2. Build rankings: `[{userId, username, rank, cardCount: 0}]`
3. Insert vào `game_sessions` (room_id, started_at, ended_at)
4. Insert 4 records vào `game_results` (session_id, user_id, rank)
5. Delete Redis key `game:{roomId}`
6. Update room status = WAITING
7. Broadcast `game:over` → `{ rankings: [{rank, userId, username}], sessionId }`
   **Error / Edge Cases:**

- DB insert fail → log error, vẫn broadcast game:over (kết quả không persist được)

---

### Operation: getRoomHistory

**Module:** HistoryModule (API)
**Business Purpose:** Lấy danh sách tất cả các ván đã chơi trong một phòng
**Triggers:** User click tab "Lịch Sử" trong phòng
**Input Context:**

- `roomId` (từ URL param)
- `userId` (từ JWT — kiểm tra user có trong phòng không)
  **Output Context:**
- Trả về `{ sessions: [{ sessionId, startedAt, endedAt, results: [{rank, username}] }] }`
  **Dependencies:** PostgreSQL game_sessions, game_results
  **Business Flow:**

1. Kiểm tra userId có trong room_players của roomId không
2. Query game_sessions JOIN game_results JOIN users WHERE room_id = roomId
3. Sort theo started_at DESC (ván mới nhất đầu tiên)
4. Return formatted response
   **Error / Edge Cases:**

- User không trong phòng → 403 Forbidden
- Phòng không tồn tại → 404 Not Found
```

---

## BƯỚC 6 — Block Decomposition + Prompt cho Antigravity

### Tạo Change Proposals

```bash
# Cấu trúc thư mục changes
openspec/changes/
  01-auth/
    proposal.md
    design.md
  02-room-management/
    proposal.md
    design.md
  03-game-engine/
    proposal.md
    design.md      ← Chi tiết nhất
  04-realtime-gateway/
    proposal.md
    design.md
  05-frontend-ui/
    proposal.md
    design.md
```

---

### Prompt Antigravity — Game Engine (Operation: playCards)

Paste vào Antigravity chat Manager View:

```
Context:
- openspec/project.md
- openspec/specs/05-operations-context.md (section: playCards, validateHand, compareHands)
- openspec/changes/03-game-engine/design.md

Implement the following in TypeScript (NestJS GameGateway + pure GameRulesModule):

=== GameRulesModule (Pure TypeScript, NO NestJS dependencies) ===

File: src/game/game-rules.module.ts

Types needed:
type Suit = 'S' | 'C' | 'D' | 'H'  // Spade < Club < Diamond < Heart
type Rank = '3'|'4'|'5'|'6'|'7'|'8'|'9'|'T'|'J'|'Q'|'K'|'A'|'2'
type Card = { suit: Suit, rank: Rank }
type HandType =
  | { type: 'SINGLE', card: Card }
  | { type: 'PAIR', cards: [Card, Card] }
  | { type: 'TRIPLE', cards: Card[] }
  | { type: 'FOUR_OF_KIND', cards: Card[] }
  | { type: 'STRAIGHT', cards: Card[], length: number }
  | { type: 'CONSECUTIVE_PAIRS', cards: Card[], pairCount: number }

Export functions:
- validateHand(cards: Card[]): HandType | null
- compareHands(attacker: HandType, defender: HandType): boolean
- canCut(attacker: HandType, defender: HandType): boolean
- sortCards(cards: Card[]): Card[]

Follow EXACT block decomposition in design.md.
Include JSDoc comments for each function.
Export a module-level constant RANK_ORDER and SUIT_ORDER.

=== GameGateway ===

File: src/game/game.gateway.ts

NestJS WebSocket Gateway, namespace: '/game'
Use @WebSocketGateway({ namespace: '/game', cors: { origin: '*' } })

Inject: GameStateService, GameRulesModule (as utility), RedisService

@SubscribeMessage('game:play')
async handlePlay(client: Socket, payload: { cards: Card[] }): Promise<void>

Follow EXACT block decomposition:
Block 1: Get gameState from Redis ('game:{roomId}')
Block 2: Validate turn + card ownership + hand validity
Block 3: Core processing (apply action, check finish, get next turn)
Block 4: State update (write Redis, persist if game over)
Block 5: Broadcast state update

On error: client.emit('game:error', { message: string, code: string })
On success: broadcast to room 'game:{roomId}': game:state_update with MASKED state
  (each player only sees their own cards, others show card COUNT only)
```

---

### Prompt Antigravity — Frontend Game Room UI

```
Context:
- openspec/project.md
- openspec/specs/05-operations-context.md
- openspec/specs/02-system-context.md (design constraints)

Create the Game Room UI in Next.js 14 with TailwindCSS.

=== Design Rules ===
- Dark mode ONLY. Background: #0f1117 (near-black)
- Card table: #1a2035 (dark navy)
- Accent color: #e8d5a3 (warm gold for highlights only)
- Text: #e2e8f0 (light gray)
- NO gradients. NO shadows with spread > 4px.
- Font: Inter (from Google Fonts)

=== Layout (Desktop 1280px) ===
- Center: octagonal card table (#1a2035, border: 2px solid #2d3748)
- Top player area: opponent cards (face down), username, card count
- Left/Right player areas: opponent cards (face down), rotated usernames
- Bottom: YOUR hand — cards displayed face up, fanned layout
- Bottom-right overlay: Chat panel (collapsible, 300px wide)
- Top-right: Room info (room code, game #, timer)
- Center of table: last played cards (large, animated when new cards played)
- Below last played cards: "PASS" indicator if all passed

=== Card Component ===
File: components/Card.tsx
Props: { suit: Suit, rank: Rank, faceDown?: boolean, selected?: boolean, size?: 'sm'|'md'|'lg' }

Card design:
- White background (#ffffff) for face-up cards
- Dark navy (#1e3a5f) for face-down cards
- Rank + Suit in top-left AND bottom-right (rotated 180°)
- Suit colors: Hearts/Diamonds = #dc2626 (red), Spades/Clubs = #1e293b (dark)
- Suit symbols as Unicode: ♠ ♣ ♦ ♥
- Selected state: translateY(-16px) + border: 2px solid #e8d5a3
- Size sm: 40x56px, md: 60x84px, lg: 80x112px
- Hover: translateY(-4px) transition 150ms

=== Player Hand ===
File: components/PlayerHand.tsx
Props: { cards: Card[], selectedCards: Card[], onCardClick: (card: Card) => void }

- Fan layout: cards overlap, each offset 28px right
- Allow multi-select (for valid hand combinations)
- "Đánh Bài" button: appears when selectedCards form a valid hand
- "Bỏ Lượt" button: always visible when it's your turn

=== Emoji Reactions ===
8 emoji options: 😂 😤 🤯 🥳 😢 😎 🫵 👏
When received: animate from player's position, float up, fade out in 2s.
```

---

## Database Schema (PostgreSQL)

```sql
-- Dán vào Antigravity với prompt: "Create migration file for this schema"

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(6) UNIQUE NOT NULL,
  room_name VARCHAR(30),
  host_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'WAITING', -- WAITING, PLAYING, FINISHED
  player_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE room_players (
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  seat INT NOT NULL CHECK (seat BETWEEN 0 AND 3),
  is_host BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  session_number INT NOT NULL, -- ván thứ mấy trong phòng
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ
);

CREATE TABLE game_results (
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  rank INT NOT NULL CHECK (rank BETWEEN 1 AND 4), -- 1=nhất, 4=bét
  PRIMARY KEY (session_id, user_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  content VARCHAR(200),
  type VARCHAR(10) DEFAULT 'text', -- 'text' or 'system'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rooms_code ON rooms(room_code);
CREATE INDEX idx_room_players_room ON room_players(room_id);
CREATE INDEX idx_game_sessions_room ON game_sessions(room_id);
CREATE INDEX idx_messages_room ON messages(room_id, created_at DESC);
```

---

## Redis Key Structure

```
game:{roomId}           → GameState JSON (TTL 4 hours)
user:room:{userId}      → roomId (TTL 4 hours) — biết user đang ở phòng nào
room:sockets:{roomId}   → Set of socketIds (TTL 4 hours)
```

**GameState JSON Structure:**

```json
{
  "roomId": "uuid",
  "status": "PLAYING",
  "currentTurn": "userId",
  "players": [
    { "userId": "...", "username": "...", "seat": 0, "cards": ["3S","4H",...], "cardCount": 13 }
  ],
  "lastPlayedCards": [],
  "lastPlayedBy": null,
  "passCount": 0,
  "finishedOrder": [],
  "roundNumber": 1,
  "startedAt": "ISO8601"
}
```

---

## Luồng Navigate 3 Màn Hình

```
/                 → LobbyPage (danh sách phòng, nút Tạo Phòng)
/?room=XXXXXX     → Redirect → /room/XXXXXX (nếu status WAITING)
/room/[code]      → RoomLobbyPage (phòng chờ, 4 slots)
/room/[code]/game → GamePage (phòng chơi)
```

---

## Checklist Trước Khi Bắt Đầu Code

- [ ] `openspec/project.md` đã có rules đầy đủ
- [ ] Tất cả 5 file specs đã review và approved
- [ ] Database schema đã migrate
- [ ] Redis đã chạy local
- [ ] `GEMINI.md` đã configure đúng models
- [ ] ag-kit agents đã init thành công (check `.agent/agents/`)
- [ ] Mỗi lần mở session mới trong Antigravity → paste master context prompt

---

## Master Context Prompt (Paste vào đầu mỗi session Antigravity)

```
Project: Tiến Lên Miền Nam Web Game
Stack: Next.js 14, NestJS, Socket.io, PostgreSQL, Redis, TailwindCSS
Rules: openspec/project.md
Current specs: openspec/specs/ (01 → 05)
Active changes: openspec/changes/[current-feature]/

Before writing ANY code:
1. Read the relevant spec in openspec/specs/05-operations-context.md
2. Read the design.md in openspec/changes/[feature]/
3. Follow the block decomposition EXACTLY
4. Game logic validation is 100% server-side
5. Dark mode only, no gradients
6. Emit game:error for all validation failures (never throw to client)
```
