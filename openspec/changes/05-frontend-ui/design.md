# Frontend UI — Design Document

## Component Architecture

```
frontend/src/
├── app/
│   ├── layout.tsx          ← Plus Jakarta Sans, dark mode
│   ├── globals.css         ← Complete design system
│   ├── page.tsx            ← Lobby (room grid + sidebar)
│   ├── auth/page.tsx       ← Login / Register
│   └── room/[code]/
│       ├── page.tsx        ← Waiting Room (4 seats + chat)
│       ├── game/page.tsx   ← Main Gameplay
│       ├── result/page.tsx ← Session Summary
│       └── history/page.tsx← Round History
├── components/
│   ├── Card.tsx            ← Playing card (face-up/down, selected)
│   └── PlayerHand.tsx      ← Fan layout with actions
├── lib/
│   ├── design-tokens.ts    ← Stitch-extracted tokens
│   ├── socket.ts           ← Socket.io client
│   └── stores/             ← Zustand state management
│       ├── auth-store.ts
│       ├── room-store.ts
│       └── game-store.ts
```

## State Management (Zustand)

### auth-store

```
{ user, token, isAuthenticated, login(), register(), logout() }
```

### room-store

```
{ room, players, messages, createRoom(), joinRoom(), leaveRoom(), sendMessage() }
```

### game-store

```
{ gameState, myCards, selectedCards, toggleCard(), playCards(), passAction() }
```

## Design Rules (from Stitch)

- Theme: DARK mode
- Font: Plus Jakarta Sans
- Border radius: 8px
- Primary: #5e19e6
- Background: #0a0a0f
- Surface: #1a1a2e
- No gradients
- Card face: #ffffff, back: #1e3a5f
- Suit colors: Red (#dc2626), Dark (#1e293b)
- Selected card: lift -16px + border #e8d5a3 + glow

## Navigation

```
/ → Lobby (room list, create)
/?room=XXXXXX → redirect to /room/XXXXXX
/auth → Login / Register
/room/[code] → Waiting Room
/room/[code]/game → Gameplay
/room/[code]/result → Summary
/room/[code]/history → History
```
