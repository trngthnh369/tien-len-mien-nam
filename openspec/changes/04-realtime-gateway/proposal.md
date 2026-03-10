# Change Proposal: Realtime Gateway

## Summary

Socket.io gateways for room lobby, gameplay, and chat events.

## Files to Create

- `backend/src/gateways/room.gateway.ts`
- `backend/src/gateways/game.gateway.ts`
- `backend/src/gateways/chat.gateway.ts`
- `backend/src/gateways/ws-auth.guard.ts`

## Operations

- **RoomGateway:** connectRoomLobby, playerReady, startGame, kickPlayer
- **GameGateway:** joinGame, playCards, passAction, reconnectGame
- **ChatGateway:** sendMessage, sendEmoji

## Stitch Screens

- Waiting Room: `65f86dad0e6042d6832297da4605a5bf`
- Main Gameplay: `bc321949426741aebc5093e4ff756405`
