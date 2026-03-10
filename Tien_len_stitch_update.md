# 🎨 Cập Nhật Quy Trình: Tích Hợp Google Stitch → Antigravity MCP

> **Mục tiêu:** Thay vì tự prompt Antigravity về UI, bạn thiết kế visual trên Stitch trước,
> rồi để Antigravity đọc design đó qua MCP và chuyển thành React components chuẩn.

---

## Bức Tranh Tổng Thể (Đã Cập Nhật)

```
TRƯỚC (cũ):
Prompt mô tả UI → Antigravity tự "tưởng tượng" ra code UI

SAU (mới):
Stitch (visual design) → stitch-mcp → Antigravity đọc HTML/screenshot
→ Convert sang Next.js + TailwindCSS theo đúng pixel
```

```
## Stitch Instructions

Get the images and code for the following Stitch project's screens:

## Project

ID: 2960647651702440815

## Screens:
1. Login and Registration Screen
    ID: 3e00707a363a491d9a3633f4f4b3189a

2. Game Lobby Screen
    ID: 221e47b5588e4d17ad9a61a1d47ed034

3. Create Room Modal
    ID: 81c3fb17a7564cb1ae20df4db41a34de

4. Waiting Room Screen
    ID: 65f86dad0e6042d6832297da4605a5bf

5. Round History Logs
    ID: 3576ca89e99f479ab236530ec64c5d9b

6. Game Session Summary
    ID: 163afcdb54324cb1a388a46820e67614

7. Invite Players Screen
    ID: 9d7eb39fa4c54de0b0aa67793e073b05

8. Main Gameplay Screen
    ID: bc321949426741aebc5093e4ff756405

Use a utility like `curl -L` to download the hosted URLs.
```

````
### A.2 — Thêm vào GEMINI.md (config của Antigravity)

Mở file `GEMINI.md` ở root project, thêm section MCP:

```json
// Thêm vào phần mcpServers trong GEMINI.md
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["@_davideast/stitch-mcp", "proxy"]
    },
    "ag-kit": {
      "command": "npx",
      "args": ["@vudovn/ag-kit", "serve"]
    }
  }
}
````

> ⚠️ Sau khi thêm vào GEMINI.md, **restart Antigravity IDE** để MCP tools được load.
> Kiểm tra bằng cách gõ `/stitch` trong chat — nếu thấy tool list là thành công.

### A.3 — Thêm Stitch project ID vào openspec

Tạo file `openspec/specs/06-stitch-design.md`:

```markdown
# 06 – STITCH DESIGN REFERENCE

## Project Info

**Stitch Project ID:** [PASTE_PROJECT_ID_TỪ_STITCH_URL_VÀO_ĐÂY]
**Project URL:** https://stitch.withgoogle.com/project/[PROJECT_ID]

## Screen Mapping

| Screen Name      | Screen ID     | Route Next.js        | Component File                   |
| ---------------- | ------------- | -------------------- | -------------------------------- |
| Lobby / Sảnh     | [SCREEN_ID_1] | /                    | app/page.tsx                     |
| Login / Register | [SCREEN_ID_2] | /auth                | app/auth/page.tsx                |
| Phòng Chờ        | [SCREEN_ID_3] | /room/[code]         | app/room/[code]/page.tsx         |
| Phòng Chơi       | [SCREEN_ID_4] | /room/[code]/game    | app/room/[code]/game/page.tsx    |
| Tổng Kết Ván     | [SCREEN_ID_5] | /room/[code]/result  | app/room/[code]/result/page.tsx  |
| Lịch Sử Phòng    | [SCREEN_ID_6] | /room/[code]/history | app/room/[code]/history/page.tsx |

## Design Tokens (Extract từ Stitch)

<!-- Antigravity sẽ tự điền phần này sau khi chạy lệnh extract design DNA -->

**Primary Colors:** TBD
**Typography:** TBD
**Spacing Scale:** TBD
```

---

## BƯỚC B — Thiết Kế Trên Stitch (6 Màn Hình)

Vào **stitch.withgoogle.com**, tạo project mới tên `tien-len-game`.

Dùng **Gemini 2.5 Pro mode** (Experimental) để được chất lượng cao nhất.

---

### Screen 1 — Lobby / Sảnh Chờ

**Prompt cho Stitch:**

```
Design a dark mode web lobby for a Vietnamese card game "Tiến Lên Miền Nam"
(a 4-player climbing card game).

Style:
- Background: very dark navy #0f1117
- Cards/panels: #1a2035 with subtle #2d3748 borders
- Accent: warm gold #e8d5a3 for titles and highlights only
- Text: light gray #e2e8f0
- NO gradients. NO glow effects. Flat, clean design.
- Font: Inter

Layout (desktop 1280px + mobile responsive):
- Top navigation bar: game logo left, username + logout right
- Hero section: "Tiến Lên Miền Nam" title, subtitle "4 người - Đánh tranh nhất nhì ba bét"
- Two large action buttons side by side:
  "TẠO PHÒNG" (gold border, dark bg) and "THAM GIA PHÒNG" (input field + join button)
- Section below: "PHÒNG ĐANG CHỜ NGƯỜI" — grid of room cards (3 columns)
  Each room card shows: room name, host username, player count (e.g. "2/4"), JOIN button
- Empty state when no rooms: illustration + "Chưa có phòng nào, hãy tạo phòng mới!"
- Footer: very subtle, game version

Do NOT use gradients. Do NOT use rounded corners larger than 8px.
Make it feel like a serious game lobby, not a casual mobile app.
```

---

### Screen 2 — Đăng Nhập / Đăng Ký

**Prompt cho Stitch:**

```
Design a dark mode authentication screen for a Vietnamese card game.

Style: Same as lobby — dark #0f1117 bg, #1a2035 card, gold #e8d5a3 accent, no gradients.

Layout (centered card, max-width 420px):
- Game logo/title at top: "Tiến Lên" in large text
- Toggle tabs: "ĐĂNG NHẬP" | "ĐĂNG KÝ" (underline style, not pill)
- Form fields: username input, password input (dark bg, light border, visible placeholder)
- Primary button: full-width, gold background #e8d5a3, dark text, "ĐĂNG NHẬP"
- For register: additional "Xác nhận mật khẩu" field
- Below form: very small "Bằng cách đăng ký, bạn đồng ý với điều khoản sử dụng"
- NO social login buttons
- Background: faint card suit symbols (♠♣♦♥) as subtle texture
```

---

### Screen 3 — Phòng Chờ (Room Lobby)

**Prompt cho Stitch:**

```
Design a dark mode waiting room for a 4-player card game.

Style: Dark #0f1117 bg, #1a2035 panel bg, gold #e8d5a3 accent, no gradients.

Layout:
- Top bar: room code "PHÒNG: AB12CD" (large, monospace font) + copy button + invite link button
- Center: 4 player seats arranged like a card table (top, left, right, bottom)
  Each seat shows: circular avatar placeholder, username, "SẴN SÀNG" / "ĐANG CHỜ" badge
  Empty seats show: "Chờ người chơi..." with dotted border
  Host seat has a crown icon
- Right panel (300px): Chat area with message list + input
  8 emoji reaction buttons in a row above chat input: 😂 😤 🤯 🥳 😢 😎 🫵 👏
- Bottom center:
  For HOST: "BẮT ĐẦU VÁN ĐẤU" button (gold, disabled until 4 players) + "RỜI PHÒNG" link
  For non-host: "SẴN SÀNG" toggle button + "RỜI PHÒNG" link
- Small "Lịch sử phòng: 0 ván" counter at top right
```

---

### Screen 4 — Phòng Chơi (Game Room) — _Màn hình quan trọng nhất_

**Prompt cho Stitch:**

```
Design a dark mode card game playing screen for 4-player Vietnamese card game "Tiến Lên Miền Nam".

Style: Very dark bg #0f1117, table surface #1a2035, gold #e8d5a3 accent, NO gradients.

Layout (landscape, 1280x800px):
TOP area (opponent — Player 2):
- Username centered, "Còn 10 lá" badge
- Row of 10 face-down cards (overlapping, dark backs with diamond pattern)
- "ĐANG SUY NGHĨ..." timer indicator when it's their turn

LEFT side (opponent — Player 3, rotated):
- Username rotated 90°, card count badge
- Column of 8 face-down cards (overlapping)

RIGHT side (opponent — Player 1, rotated):
- Username rotated -90°, card count badge
- Column of 8 face-down cards

CENTER TABLE (#1a2035, octagonal shape with #2d3748 border):
- "BÀN BÀI" label at top
- Currently played cards: 3 cards displayed face-up, large, centered
- Below cards: "Đánh bởi: Nguyễn Văn A" label
- "TẤT CẢ BỎ LƯỢT" banner when everyone passed (shown in gold)
- Turn indicator: "LƯỢT CỦA: [username]" pill at center top of table

BOTTOM area (your hand — Player 4, YOU):
- "BÀI CỦA BẠN" label left
- 13 cards fanned out, face-up
  Card design: white background, rank top-left, suit symbol centered
  Hearts/Diamonds = red #dc2626, Spades/Clubs = dark #1e293b
  Selected cards: lifted up 16px with gold border
- Action buttons right of hand:
  "ĐÁNH BÀI" button (gold, active only when valid selection)
  "BỎ LƯỢT" button (dark, always active on your turn)

TOP RIGHT corner:
- Minimized chat panel (expand button with unread badge)
- "VÁN 3" indicator
- Timer "02:15"

EMOJI reactions: floating animations when someone sends emoji
Show reaction briefly above the sender's area then fade out.
```

---

### Screen 5 — Màn Hình Tổng Kết

**Prompt cho Stitch:**

```
Design a dark mode game result/summary screen for a 4-player card game.

Style: Dark #0f1117, panels #1a2035, gold accent, no gradients.

Layout (modal/overlay or full page):
- Title: "KẾT THÚC VÁN 3"
- Rankings podium (horizontal, 4 positions):
  🥇 NHẤT: username, avatar, trophy icon — gold border
  🥈 NHÌ: username, silver border
  🥉 BA: username, bronze border
  💀 BÉT: username, dark red border, skull icon
- Stats for each player: number of remaining cards (for loser), turns played
- Buttons row: "VÁN MỚI" (gold, for host) + "XEM LỊCH SỬ" + "RỜI PHÒNG"
- Below: small table showing all 3 historical rounds in this session

Keep it clean and celebratory but NOT over-the-top. No confetti animations in design.
```

---

### Screen 6 — Lịch Sử Phòng

**Prompt cho Stitch:**

```
Design a dark mode match history screen for a card game room.

Style: Dark theme consistent with previous screens. Table-heavy layout.

Layout:
- Header: "LỊCH SỬ PHÒNG AB12CD" + "5 ván đã chơi"
- Filter/sort: "Tất cả" | "Của tôi" tabs
- Table or card list showing each session:
  Columns: Ván #, Thời gian, Nhất, Nhì, Ba, Bét
  Each row shows usernames with colored rank badges (gold/silver/bronze/red)
- Click on a row → expands to show more details (turns played, duration)
- Summary panel at bottom: each player's win/loss record in this room
  e.g. "Nguyễn A: 🥇×2 🥈×1 🥉×1 💀×1"
- "ĐÓNG" button to return to room lobby
```

---

## BƯỚC C — Extract Design từ Stitch vào Antigravity

Sau khi thiết kế xong 6 màn hình trên Stitch, lấy `projectId` từ URL của Stitch.

### C.1 — Preview tất cả screens

```bash
# Xem tất cả screens trong project của bạn
npx @_davideast/stitch-mcp view --projects

# Sau khi có project-id:
npx @_davideast/stitch-mcp view --project YOUR_PROJECT_ID

# Lưu screen IDs vào openspec/specs/06-stitch-design.md
```

### C.2 — Serve local để preview

```bash
# Xem live preview của designs trước khi convert
npx @_davideast/stitch-mcp serve -p YOUR_PROJECT_ID
# Mở http://localhost:3456 để xem từng screen
```

### C.3 — Prompt Antigravity đọc Design DNA

Trong Antigravity chat:

```
Use the stitch MCP tool to analyze the design system.

1. Call stitch tool: list_projects → find "tien-len-game" project
2. For the project, call: list_screens → get all screen IDs
3. For EACH screen, call: get_screen_image → analyze the screenshot
4. Extract the Design DNA:
   - Exact hex color values used
   - Font sizes and weights
   - Spacing values (padding, margins, gaps)
   - Border radius values
   - Component patterns (cards, buttons, inputs, badges)

5. Update openspec/specs/06-stitch-design.md with:
   - All color tokens found
   - Typography scale
   - Component inventory
   - Screen IDs mapped to routes
```

---

## BƯỚC D — Convert Stitch → Next.js Components

Đây là quy trình chính để biến Stitch HTML thành React components.

### D.1 — Build Site từ Stitch (lấy full HTML)

Trong Antigravity chat, dùng MCP tool:

```
Use stitch MCP tool: build_site

Input:
{
  "projectId": "YOUR_PROJECT_ID",
  "routes": [
    { "screenId": "LOBBY_SCREEN_ID", "route": "/" },
    { "screenId": "AUTH_SCREEN_ID", "route": "/auth" },
    { "screenId": "ROOM_LOBBY_SCREEN_ID", "route": "/room/[code]" },
    { "screenId": "GAME_SCREEN_ID", "route": "/room/[code]/game" },
    { "screenId": "RESULT_SCREEN_ID", "route": "/room/[code]/result" },
    { "screenId": "HISTORY_SCREEN_ID", "route": "/room/[code]/history" }
  ]
}

After getting the HTML for each screen, DO NOT paste it directly.
Instead, analyze each screen's structure and identify:
1. Reusable components (list them)
2. Layout structure
3. Interactive elements (buttons, inputs, toggles)
```

### D.2 — Prompt Convert từng Screen

**Template prompt để convert mỗi screen (dùng lần lượt cho 6 screens):**

```
Context:
- openspec/specs/05-operations-context.md (relevant sections)
- openspec/specs/06-stitch-design.md (design tokens + screen mapping)
- Stitch screen code từ stitch MCP: get_screen_code({ screenId: "GAME_SCREEN_ID" })

Task: Convert the Stitch HTML design for [TÊN SCREEN] into a Next.js component.

Requirements:
1. PIXEL-FAITHFUL: Match the Stitch design as closely as possible
   - Use EXACT color values from 06-stitch-design.md design tokens
   - Replicate spacing/sizing from Stitch HTML

2. TECH STACK CONVERSION:
   - Replace all inline styles with TailwindCSS classes
   - Convert static HTML → React state-driven components
   - Replace hardcoded data → TypeScript props/interfaces

3. INTERACTIVE ELEMENTS to add (NOT in Stitch — Stitch is static):
   [Chỉ định theo từng screen, ví dụ cho Game Screen:]
   - Card selection: onClick → toggle selected state
   - "ĐÁNH BÀI" button: enabled only when selectedCards form valid hand
   - Socket event listeners: game:state_update → update UI
   - Animation: selected cards lift up 16px (CSS transition)

4. FILE OUTPUT:
   - app/room/[code]/game/page.tsx (page shell, server component)
   - components/game/GameBoard.tsx (main client component)
   - components/game/PlayerHand.tsx
   - components/game/OpponentArea.tsx
   - components/game/TableCenter.tsx
   - components/cards/Card.tsx (if not exists)

5. CONSTRAINTS:
   - NO gradient classes (no bg-gradient-*, no from-*, no to-*)
   - Dark mode only (no light mode variants)
   - Responsive: mobile version collapses to vertical layout
   - All text in Vietnamese
   - Mark TODO comments where socket.io hooks will be connected

Use the Stitch screenshot as ground truth for visual accuracy.
If Stitch HTML and screenshot conflict, trust the screenshot.
```

### D.3 — Tạo Design Token File (shared across all components)

Sau khi Antigravity extract xong Design DNA, tạo file này:

```typescript
// lib/design-tokens.ts (generated từ Stitch design)
// Antigravity sẽ auto-fill dựa trên get_screen_image analysis

export const colors = {
  bg: {
    primary: "#0f1117", // main background
    surface: "#1a2035", // cards, panels
    border: "#2d3748", // subtle borders
  },
  accent: {
    gold: "#e8d5a3", // highlights, active states
    goldDark: "#c4a96b", // hover state
  },
  text: {
    primary: "#e2e8f0", // main text
    secondary: "#94a3b8", // muted text
    muted: "#475569", // very muted
  },
  rank: {
    first: "#e8d5a3", // gold — nhất
    second: "#94a3b8", // silver — nhì
    third: "#b45309", // bronze — ba
    last: "#991b1b", // red — bét
  },
  card: {
    face: "#ffffff", // face-up cards
    back: "#1e3a5f", // face-down cards
    redSuit: "#dc2626", // hearts, diamonds
    darkSuit: "#1e293b", // spades, clubs
  },
} as const;

export const spacing = {
  cardOverlap: "28px", // overlap between cards in hand
  cardLiftSelected: "-16px", // translateY when card selected
} as const;
```

---

## BƯỚC E — Cập Nhật openspec Sau Khi Có Stitch Designs

Thêm vào `openspec/specs/05-operations-context.md` section mới:

```markdown
## 5.4 Frontend UI Contract (Updated — Stitch-driven)

### Mapping: Stitch Screen → Next.js Route → Socket Events

| Screen (Stitch) | Route                | Socket Events Consumed                                                                    |
| --------------- | -------------------- | ----------------------------------------------------------------------------------------- |
| Lobby           | /                    | (REST only)                                                                               |
| Auth            | /auth                | (REST only)                                                                               |
| Room Lobby      | /room/[code]         | room:state, room:player_joined, room:player_left, room:game_starting                      |
| Game Room       | /room/[code]/game    | game:state_update, game:player_finished, game:over, chat:new_message, chat:emoji_reaction |
| Result          | /room/[code]/result  | (REST: GET /history/:sessionId)                                                           |
| History         | /room/[code]/history | (REST: GET /history?roomId=...)                                                           |

### Component Fidelity Rule

- Stitch screenshot = source of truth for visual design
- Antigravity MUST call get_screen_image trước khi implement mỗi component
- Nếu TailwindCSS không đủ để match design → dùng CSS custom properties
- KHÔNG tự sáng tạo UI ngoài Stitch design
```

---

## Checklist Updated (Bổ Sung)

```
PHASE 0 — Setup
[x] ag-kit init xong → .agent/ có 16 agents
[x] openspec init xong → openspec/ structure
[ ] stitch-mcp init → npx @_davideast/stitch-mcp init
[ ] GEMINI.md đã có mcpServers.stitch config
[ ] Restart Antigravity IDE

PHASE STITCH — Design
[ ] Tạo project "tien-len-game" trên stitch.withgoogle.com
[ ] Generate Screen 1: Lobby (prompt ở Bước B)
[ ] Generate Screen 2: Auth
[ ] Generate Screen 3: Phòng Chờ
[ ] Generate Screen 4: Phòng Chơi ← iterate nhiều nhất
[ ] Generate Screen 5: Tổng Kết
[ ] Generate Screen 6: Lịch Sử
[ ] Điền tất cả screenIds vào openspec/specs/06-stitch-design.md

PHASE 1-5 — Architecture (giống guide cũ)
[ ] 01-planning-context.md ✓
[ ] 02-system-context.md ✓
[ ] 03-subsystems-context.md ✓
[ ] 04-modules-context.md ✓
[ ] 05-operations-context.md ✓ (thêm section 5.4)

PHASE 6 — Implementation
[ ] Antigravity extract Design DNA (Bước C.3)
[ ] Generate design-tokens.ts từ Stitch colors
[ ] Convert từng screen (6 screens, Bước D.2)
[ ] Backend: GameEngine, NestJS Gateway (từ guide cũ)
[ ] Connect sockets: replace TODO comments với real socket hooks
[ ] Test: mỗi component match Stitch screenshot >= 90%
```

---

## Tips: Iterate Nhanh Với Stitch + Antigravity

**Khi design trên Stitch không đúng ý:**

```
# Trong Stitch chat (iterate within Stitch):
"Make the card table darker and add a subtle grid texture to the table surface"
"The player hand area is too cramped, spread cards further apart"
"The ĐÁNH BÀI button needs more contrast, make it more prominent"
```

**Khi Antigravity convert sai so với Stitch:**

```
# Trong Antigravity chat:
Use stitch MCP: get_screen_image({ screenId: "GAME_SCREEN_ID" })
Compare the screenshot with the current implementation in components/game/GameBoard.tsx.
List ALL visual differences and fix them one by one.
Priority: spacing > colors > typography > borders
```

**Golden rule:** Stitch là nguồn sự thật duy nhất cho visual.
Antigravity chỉ được quyết định về: logic tương tác, state management, socket wiring.

```

```
