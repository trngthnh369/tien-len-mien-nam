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

### Operation: register

**Module:** AuthModule (API)
**Business Purpose:** Tạo tài khoản mới, trả về JWT ngay sau đăng ký
**Input Context:**

- `username` (string, 3-20 ký tự, unique)
- `password` (string, min 6 ký tự)

**Output Context:**

- Tạo user mới trong DB
- Trả về `{ accessToken, refreshToken, user: { id, username } }`

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

**Business Flow:**

1. Kiểm tra user có đang trong phòng khác không
2. Generate `roomCode` bằng nanoid(6) uppercase alphanumeric
3. Insert room vào bảng `rooms` (host=userId, status=WAITING, player_count=1)
4. Insert host vào bảng `room_players` (seat=0, is_host=true)
5. Trả về room info + inviteUrl = `${BASE_URL}/?room=${roomCode}`

---

### Operation: playCards

**Module:** GameGateway (Socket.io)
**Business Purpose:** Xử lý player đánh bài, validate luật, cập nhật game state, broadcast
**Input Context:**

- Socket auth: `{ userId }`
- Event payload: `{ cards: Card[] }`

**Business Flow:**

1. Lấy game state từ Redis key `game:{roomId}`
2. Kiểm tra đúng lượt của userId
3. Kiểm tra các lá bài có thực sự trong tay userId không
4. Gọi `GameRulesModule.validateHand(cards)` → phân loại bộ bài
5. Kiểm tra `lastPlayedCards` trên bàn
6. Gọi `GameStateModule.applyAction(state, {type: 'PLAY', userId, cards})`
7. Kiểm tra tay userId còn bao nhiêu lá
8. Tính `nextTurn`
9. Ghi state mới vào Redis
10. Nếu ván kết thúc: gọi `finalizeGame()`
11. Emit `game:state_update` tới room

---

### Operation: validateHand

**Module:** GameRulesModule (Game Core)
**Business Purpose:** Phân loại bộ bài theo luật Tiến Lên Miền Nam

**Business Flow:**

1. Nếu 1 lá → SingleCard (rank 3..2, suit S<C<D<H)
2. Nếu 2 lá cùng rank → Pair (đôi)
3. Nếu 3 lá cùng rank → Triple (ba lá)
4. Nếu 4 lá cùng rank → FourOfAKind (tứ quý)
5. Nếu 3-12 lá liên tiếp rank, không có lá 2 → Straight (sảnh, min 3 lá)
6. Nếu 3 đôi liên tiếp → ConsecutivePairs (ba đôi thông)
7. Nếu 4 đôi liên tiếp → ConsecutivePairs (4 đôi thông)
8. Nếu không khớp → return null

---

### Operation: compareHands

**Module:** GameRulesModule (Game Core)
**Business Purpose:** So sánh 2 bộ bài, trả về bộ nào mạnh hơn

**Business Flow:**

1. Nếu khác type: chỉ FourOfAKind chặt được Single2, ConsecutivePairs chặt được Single2/Pair2
2. Nếu cùng type: cùng số lá, so sánh lá cao nhất (rank trước, suit sau nếu tie)
3. Thứ tự rank: 3<4<5<6<7<8<9<T<J<Q<K<A<2
4. Thứ tự suit: Spade < Club < Diamond < Heart
5. Sảnh: phải cùng số lá, so sánh lá cao nhất

---

### Operation: finalizeGame

**Module:** GameStateModule (Game Core)
**Business Purpose:** Kết thúc ván đấu, gán xếp hạng, persist kết quả

**Business Flow:**

1. Player thứ 4 (người cuối còn bài) tự động bét (rank 4)
2. Build rankings: `[{userId, username, rank, cardCount: 0}]`
3. Insert vào `game_sessions` (room_id, started_at, ended_at)
4. Insert 4 records vào `game_results` (session_id, user_id, rank)
5. Delete Redis key `game:{roomId}`
6. Update room status = WAITING
7. Broadcast `game:over` → `{ rankings, sessionId }`

---

## 5.3 Frontend UI Contract (Stitch-driven)

### Mapping: Stitch Screen → Next.js Route → Socket Events

| Screen (Stitch)      | Route                | Socket Events Consumed                                                                    |
| -------------------- | -------------------- | ----------------------------------------------------------------------------------------- |
| Login/Register       | /auth                | (REST only)                                                                               |
| Lobby                | /                    | (REST only)                                                                               |
| Create Room          | (modal)              | (REST only)                                                                               |
| Waiting Room         | /room/[code]         | room:state, room:player_joined, room:player_left, room:game_starting                      |
| Main Gameplay        | /room/[code]/game    | game:state_update, game:player_finished, game:over, chat:new_message, chat:emoji_reaction |
| Round History        | /room/[code]/history | (REST only)                                                                               |
| Game Session Summary | /room/[code]/result  | (REST only)                                                                               |
| Invite Players       | (modal)              | (REST only)                                                                               |
