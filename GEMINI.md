# GEMINI.md — Agent Configuration

## Project: Tiến Lên Miền Nam Web Game

**Stack:** Next.js 14 (App Router), NestJS, Socket.io, PostgreSQL, Redis, TailwindCSS
**Design:** Stitch-driven, Dark mode only, Plus Jakarta Sans font

## Code Rules

- Đọc spec trong `openspec/specs/` trước khi viết code
- Mọi logic game PHẢI đúng luật Tiến Lên Miền Nam chuẩn
- Real-time qua Socket.io namespaces (không polling)
- DB: `snake_case`, Code: `camelCase`
- Game state validation 100% server-side
- Client chỉ nhận masked state (không thấy bài người khác)

## File Structure

```
tien-len-mien-nam/
├── frontend/          ← Next.js 14 + TailwindCSS
│   └── src/
│       ├── app/       ← Pages (Auth, Lobby, Room, Game, History, Result)
│       ├── components/← Card, PlayerHand
│       └── lib/       ← socket.ts, design-tokens.ts, stores/
├── backend/           ← NestJS
│   └── src/
│       ├── auth/      ← JWT + bcrypt
│       ├── rooms/     ← Room CRUD
│       ├── history/   ← Game sessions + results
│       ├── redis/     ← Game state + socket tracking
│       ├── gateways/  ← Room, Game, Chat Socket.io
│       └── game/core/ ← Pure TypeScript game engine
├── openspec/          ← Specs + Change proposals
└── docker-compose.yml ← PostgreSQL + Redis
```

## Design Tokens (from Stitch)

- Primary: `#5e19e6`
- Background: `#0a0a0f`
- Surface: `#1a1a2e`
- Border: `#2d2d4a`
- Text: `#e2e8f0`
- Accent/Gold: `#e8d5a3`
- Error: `#ff4757`
- Success: `#2ed573`

## Socket Namespaces

- `/room` — Room lobby events
- `/game` — Gameplay events
- `/chat` — Chat + emoji events
