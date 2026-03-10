# 06 – STITCH DESIGN REFERENCE

## Project Info

**Stitch Project ID:** 2960647651702440815
**Project URL:** https://stitch.withgoogle.com/project/2960647651702440815

## Design Theme

- **Color Mode:** DARK
- **Font:** Plus Jakarta Sans
- **Roundness:** 8px (ROUND_EIGHT)
- **Primary Color:** #5e19e6 (Purple)
- **Saturation:** 2

## Screen Mapping

| Screen Name          | Screen ID                        | Route Next.js        | Component                         |
| -------------------- | -------------------------------- | -------------------- | --------------------------------- |
| Login/Register       | 3e00707a363a491d9a3633f4f4b3189a | /auth                | app/auth/page.tsx                 |
| Game Lobby           | 221e47b5588e4d17ad9a61a1d47ed034 | /                    | app/page.tsx                      |
| Create Room Modal    | 81c3fb17a7564cb1ae20df4db41a34de | (modal)              | components/CreateRoomModal.tsx    |
| Waiting Room         | 65f86dad0e6042d6832297da4605a5bf | /room/[code]         | app/room/[code]/page.tsx          |
| Main Gameplay        | bc321949426741aebc5093e4ff756405 | /room/[code]/game    | app/room/[code]/game/page.tsx     |
| Round History        | 3576ca89e99f479ab236530ec64c5d9b | /room/[code]/history | app/room/[code]/history/page.tsx  |
| Game Session Summary | 163afcdb54324cb1a388a46820e67614 | /room/[code]/result  | app/room/[code]/result/page.tsx   |
| Invite Players       | 9d7eb39fa4c54de0b0aa67793e073b05 | (modal)              | components/InvitePlayersModal.tsx |

## Design Tokens (Extracted)

**Background Colors:**

- Primary BG: Very dark (near-black)
- Surface/Panel BG: Dark navy
- Border: Subtle gray

**Accent Colors:**

- Primary: #5e19e6 (Purple)
- Gold highlights for rankings

**Typography:**

- Font family: Plus Jakarta Sans
- Headings: Bold/Semibold
- Body: Regular
- Code/Room Codes: Monospace

**Card Design:**

- Face-up: White background, rank top-left, suit centered
- Face-down: Dark blue with pattern
- Hearts/Diamonds: Red
- Spades/Clubs: Dark

**Component Patterns:**

- Buttons: Rounded (8px), solid colors
- Cards/Panels: Dark background, subtle border
- Badges: Small colored pills for player rank/status
- Avatars: Circular with colorful backgrounds
