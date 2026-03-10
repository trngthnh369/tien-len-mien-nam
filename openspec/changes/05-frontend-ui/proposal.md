# Change Proposal: Frontend UI (Stitch-driven)

## Summary

Convert 8 Stitch screens to Next.js 14 components with TailwindCSS.

## Design Source

- Stitch Project ID: `2960647651702440815`
- Design is the SINGLE source of truth for visual appearance

## Screen → Route → Component Mapping

| Screen          | Route                | Component                         |
| --------------- | -------------------- | --------------------------------- |
| Login/Register  | /auth                | app/auth/page.tsx                 |
| Game Lobby      | /                    | app/page.tsx                      |
| Create Room     | (modal)              | components/CreateRoomModal.tsx    |
| Waiting Room    | /room/[code]         | app/room/[code]/page.tsx          |
| Main Gameplay   | /room/[code]/game    | app/room/[code]/game/page.tsx     |
| Round History   | /room/[code]/history | app/room/[code]/history/page.tsx  |
| Session Summary | /room/[code]/result  | app/room/[code]/result/page.tsx   |
| Invite Players  | (modal)              | components/InvitePlayersModal.tsx |

## Design Tokens (from Stitch)

- Theme: DARK mode
- Font: Plus Jakarta Sans
- Roundness: 8px
- Primary color: #5e19e6
