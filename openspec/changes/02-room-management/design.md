# Room Management — Design Document

## Block Decomposition: createRoom

```
Block 1: Validate user not in another room
  - Check Redis user:room:{userId}

Block 2: Generate room code
  - nanoid(6), charset: A-Z0-9
  - Retry on collision (max 3)

Block 3: Insert room + host player
  - INSERT INTO rooms (room_code, room_name, host_id)
  - INSERT INTO room_players (room_id, user_id, seat=0, is_host=true)

Block 4: Track in Redis
  - SET user:room:{userId} = roomId

Block 5: Return { roomId, roomCode, inviteUrl }
```

## Block Decomposition: joinRoom

```
Block 1: Find room by code, validate WAITING status
Block 2: Check room not full (< 4 players)
Block 3: Check user not in another room
Block 4: Find next available seat [0,1,2,3]
Block 5: INSERT room_player, UPDATE room.player_count
Block 6: SET user:room:{userId}, return room detail
```

## Block Decomposition: leaveRoom

```
Block 1: Remove player from room_players
Block 2: DEL user:room:{userId}
Block 3: If room empty → DELETE room
Block 4: If host left → transfer host to lowest seat
Block 5: UPDATE room.player_count
```

## Files

- `src/rooms/rooms.module.ts`
- `src/rooms/rooms.service.ts`
- `src/rooms/rooms.controller.ts`
- `src/rooms/entities/room.entity.ts`
