# Tiến Lên Miền Nam — Web Game

🃏 Chơi bài Tiến Lên Miền Nam online, real-time, 4 người chơi.

## Stack

- **Frontend:** Next.js 14 + TailwindCSS + Socket.io Client + Zustand
- **Backend:** NestJS + Socket.io + TypeORM + PostgreSQL + Redis
- **Design:** Stitch AI (Dark Mode, Plus Jakarta Sans)

## Quick Start

```bash
# 1. Start databases
docker-compose up -d

# 2. Backend
cd backend
cp .env.example .env  # or use existing .env
npm install
npm run start:dev     # → http://localhost:3001

# 3. Frontend
cd frontend
npm install
npm run dev           # → http://localhost:3000
```

## Project Structure

```
├── frontend/          Next.js 14 App
│   ├── src/app/       Pages (Auth, Lobby, Room, Game, History, Result)
│   ├── src/components Card, PlayerHand
│   └── src/lib/       Stores (Zustand), Socket client, Design tokens
├── backend/           NestJS API + Socket.io
│   ├── src/auth/      JWT Authentication
│   ├── src/rooms/     Room CRUD
│   ├── src/history/   Game History
│   ├── src/gateways/  Real-time (Room, Game, Chat)
│   ├── src/redis/     Game State Store
│   └── src/game/core/ Pure Game Engine (53 tests)
├── openspec/          Specifications + Change Proposals
└── docker-compose.yml PostgreSQL + Redis
```

## Game Rules (Tiến Lên Miền Nam)

- 4 players, 13 cards each
- Play order: person with 3♠ goes first
- Hand types: Single, Pair, Triple, Four-of-a-Kind, Straight, Consecutive Pairs
- Rank: 3 < 4 < 5 < ... < K < A < 2
- Suit: ♠ < ♣ < ♦ < ♥
- Special cuts: Tứ quý chặt 2 đơn, 3 đôi thông chặt 2 đơn, 4 đôi thông chặt đôi 2
