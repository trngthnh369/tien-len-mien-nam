# Change Proposal: Room Management

## Summary

CRUD operations for game rooms with room codes, player management, and invite links.

## Files to Create

- `backend/src/rooms/rooms.module.ts`
- `backend/src/rooms/rooms.controller.ts`
- `backend/src/rooms/rooms.service.ts`
- `backend/src/rooms/dto/create-room.dto.ts`

## Operations

1. **createRoom** — Generate 6-char room code, create room, add host
2. **joinRoom** — Add player to room (max 4), assign seat
3. **getRoomList** — List rooms with status=WAITING
4. **getRoomDetail** — Room info with player list
5. **leaveRoom** — Remove player, transfer host if needed

## Stitch Screens

- Game Lobby: `221e47b5588e4d17ad9a61a1d47ed034`
- Create Room Modal: `81c3fb17a7564cb1ae20df4db41a34de`
- Invite Players: `9d7eb39fa4c54de0b0aa67793e073b05`
