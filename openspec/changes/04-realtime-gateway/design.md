# Realtime Gateway — Design Document

## Architecture

```
gateways/
├── gateways.module.ts
├── ws-auth.guard.ts    ← JWT from handshake.auth.token
├── room.gateway.ts     ← namespace: /room
├── game.gateway.ts     ← namespace: /game
└── chat.gateway.ts     ← namespace: /chat
```

## Block Decomposition: GameGateway.handlePlay

```
Block 1: Get gameState from Redis (game:{roomId})
  - If null → emit game:error

Block 2: Validate turn + card ownership + hand validity
  - currentTurn !== userId → game:error NOT_YOUR_TURN
  - cards not in hand → game:error CARDS_NOT_IN_HAND
  - validateHand returns null → game:error INVALID_HAND
  - compareHands returns false → game:error NOT_STRONG_ENOUGH

Block 3: Core processing
  - applyAction(state, { type: 'PLAY', userId, cards })
  - Returns new state or error

Block 4: State update
  - SET Redis game:{roomId} = newState
  - If game over → persist to game_sessions + game_results

Block 5: Broadcast state update
  - Each player gets MASKED state (only sees own cards)
  - game:played { userId, cards }
  - game:turnChange { currentTurn }
  - If finished: game:finished { results }
```

## Block Decomposition: RoomGateway.handleJoinRoom

```
Block 1: Validate room exists and is WAITING
Block 2: Join socket.io room (client.join(roomId))
Block 3: Track socket in Redis (SADD room:sockets:{roomId})
Block 4: Broadcast room:playerJoined to room
Block 5: Return current room state to joiner
```

## Socket Event Map

| Namespace | Client → Server                                 | Server → Client                                                                  |
| --------- | ----------------------------------------------- | -------------------------------------------------------------------------------- |
| /room     | room:join, room:ready, room:start, room:kick    | room:playerJoined, room:playerReady, room:gameStarting, room:playerLeft          |
| /game     | game:join, game:play, game:pass, game:reconnect | game:state, game:played, game:passed, game:turnChange, game:finished, game:error |
| /chat     | chat:message, chat:emoji                        | chat:newMessage, chat:emojiReaction                                              |
