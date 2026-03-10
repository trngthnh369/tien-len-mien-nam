# Project: Tiến Lên Miền Nam Web Game

Stack: Next.js 14 (App Router), NestJS, Socket.io, PostgreSQL, Redis, TailwindCSS
Style: Dark mode only. NO gradients. Flat colors, solid borders.
Design Source: Google Stitch (Project ID: 2960647651702440815)
Font: Plus Jakarta Sans
Agent config: GEMINI.md
Specs: openspec/specs/
Changes: openspec/changes/

## Stitch Screen Mapping

| Screen               | Stitch ID                        | Route                |
| -------------------- | -------------------------------- | -------------------- |
| Login/Register       | 3e00707a363a491d9a3633f4f4b3189a | /auth                |
| Game Lobby           | 221e47b5588e4d17ad9a61a1d47ed034 | /                    |
| Create Room Modal    | 81c3fb17a7564cb1ae20df4db41a34de | (modal)              |
| Waiting Room         | 65f86dad0e6042d6832297da4605a5bf | /room/[code]         |
| Main Gameplay        | bc321949426741aebc5093e4ff756405 | /room/[code]/game    |
| Round History        | 3576ca89e99f479ab236530ec64c5d9b | /room/[code]/history |
| Game Session Summary | 163afcdb54324cb1a388a46820e67614 | /room/[code]/result  |
| Invite Players       | 9d7eb39fa4c54de0b0aa67793e073b05 | (modal)              |

## Rules

- Đọc spec trước khi viết bất kỳ dòng code nào
- Mọi logic game PHẢI đúng luật Tiến Lên Miền Nam chuẩn
- Real-time qua Socket.io namespaces (không dùng polling)
- DB: snake_case. Code: camelCase
- Frontend design PHẢI pixel-faithful với Stitch screenshots
- Stitch là nguồn sự thật duy nhất cho visual design
