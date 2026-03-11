import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from './ws-auth.guard';
import { RoomsService } from '../rooms/rooms.service';
import { RedisService } from '../redis/redis.service';
import { GameGateway } from './game.gateway';

/**
 * Room Gateway — handles room lobby real-time events.
 *
 * Events (client → server):
 * - room:join      { roomCode }
 * - room:ready     { }
 * - room:start     { }
 * - room:kick      { userId }
 *
 * Events (server → client):
 * - room:playerJoined   { userId, username, seat, isHost }
 * - room:playerReady    { userId }
 * - room:gameStarting   { roomId, roomCode }
 * - room:playerLeft     { userId }
 * - room:playerKicked   { userId }
 * - room:sync           { room, players } — full state refresh
 */
@WebSocketGateway({
  namespace: '/room',
  cors: {
    origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003'],
    credentials: true,
  },
})
@UseGuards(WsAuthGuard)
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly roomsService: RoomsService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => GameGateway))
    private readonly gameGateway: GameGateway,
  ) {}

  async handleConnection(client: Socket) {
    // Parse JWT manually since WsAuthGuard doesn't fire on connection
    const token = client.handshake?.auth?.token;
    if (!token) {
      console.log(`[Room] Client ${client.id} rejected: no token`);
      client.emit('room:error', { message: 'Token không được cung cấp' });
      client.disconnect(true);
      return;
    }

    try {
      const { JwtService } = require('@nestjs/jwt');
      const jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'jwt_secret' });
      const payload = jwtService.verify(token);
      (client as any).user = { id: payload.sub, username: payload.username };
      console.log(`[Room] Client connected: ${client.id} (${payload.username})`);
    } catch {
      console.log(`[Room] Client ${client.id} rejected: invalid token`);
      client.emit('room:error', { message: 'Token không hợp lệ' });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    console.log(`[Room] Client disconnected: ${client.id}`);
    const user = (client as any).user;
    if (!user) return;

    const roomId = await this.redisService.getUserRoom(user.id);
    if (!roomId) return;

    await this.redisService.removeRoomSocket(roomId, client.id);

    // Grace period: wait 5 seconds before removing from room
    // This handles page refreshes and brief disconnections
    setTimeout(async () => {
      // Check if user reconnected (has a new socket in the room)
      const sockets = await this.redisService.getRoomSockets(roomId);
      const reconnected = sockets && sockets.length > 0 &&
        await this.redisService.getUserRoom(user.id) === roomId;

      // Check if user has any active socket connections to this room
      const roomSockets = await this.server.in(roomId).fetchSockets();
      const userReconnected = roomSockets.some(
        (s: any) => s.data?.user?.id === user.id || (s as any).user?.id === user.id
      );

      if (!userReconnected) {
        try {
          // Remove player from DB (handles host transfer + room deletion)
          await this.roomsService.leaveRoom(user.id, roomId);
          // Clean up ready state
          if (this.readyStates.has(roomId)) {
            this.readyStates.get(roomId)!.delete(user.id);
          }
          // Notify remaining players
          this.server.to(roomId).emit('room:playerLeft', {
            userId: user.id,
            username: user.username,
          });
          // Send updated room state to remaining players
          try {
            const room = await this.roomsService.getRoomDetailById(roomId);
            this.server.to(roomId).emit('room:sync', {
              room: {
                id: room.id,
                roomCode: room.roomCode,
                roomName: room.roomName,
                hostId: room.hostId,
                status: room.status,
                playerCount: room.playerCount,
              },
              players: room.players,
            });
          } catch {
            // Room may have been deleted (last player left)
          }
        } catch (err) {
          console.log(`[Room] Error cleaning up disconnect for ${user.username}:`, err);
        }
      }
    }, 5000); // 5 second grace period
  }

  /**
   * Player joins a room socket channel.
   * - Joins the socket.io room
   * - Sets Redis user-room mapping
   * - Fetches full room detail from DB
   * - Broadcasts complete room:sync to ALL players (so everyone sees updated seats)
   */
  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomCode: string },
  ) {
    const user = (client as any).user;
    const room = await this.roomsService.getRoomDetail(data.roomCode);

    // Join socket.io room using the room's DB id
    client.join(room.id);
    await this.redisService.addRoomSocket(room.id, client.id);

    // Ensure Redis knows which room this user is in (critical for game:play/pass later)
    await this.redisService.setUserRoom(user.id, room.id);

    // Broadcast full state to ALL players in room (including the joiner)
    // This ensures everyone has the same, up-to-date player list with correct seats
    this.server.to(room.id).emit('room:sync', {
      room: {
        id: room.id,
        roomCode: room.roomCode,
        roomName: room.roomName,
        hostId: room.hostId,
        status: room.status,
        playerCount: room.playerCount,
      },
      players: room.players,
    });

    // Also emit a system notification that someone joined
    this.server.to(room.id).emit('room:playerJoined', {
      userId: user.id,
      username: user.username,
      seat: room.players.find(p => p.userId === user.id)?.seat ?? 0,
      isHost: room.players.find(p => p.userId === user.id)?.isHost ?? false,
    });
  }

  // Track ready states in memory (not persisted to DB - ephemeral per session)
  private readyStates = new Map<string, Set<string>>(); // roomId -> Set of ready userIds

  @SubscribeMessage('room:ready')
  async handleReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { isReady?: boolean },
  ) {
    const user = (client as any).user;
    const roomId = await this.redisService.getUserRoom(user.id);
    if (!roomId) return;

    // Toggle or set ready state
    if (!this.readyStates.has(roomId)) {
      this.readyStates.set(roomId, new Set());
    }
    const readySet = this.readyStates.get(roomId)!;
    
    let isReady: boolean;
    if (data?.isReady !== undefined) {
      isReady = data.isReady;
    } else {
      // Toggle
      isReady = !readySet.has(user.id);
    }

    if (isReady) {
      readySet.add(user.id);
    } else {
      readySet.delete(user.id);
    }

    this.server.to(roomId).emit('room:playerReady', { userId: user.id, isReady });
  }

  @SubscribeMessage('room:start')
  async handleStartGame(@ConnectedSocket() client: Socket) {
    const user = (client as any).user;
    const roomId = await this.redisService.getUserRoom(user.id);
    if (!roomId) return;

    // Get room detail to verify host and get players
    const room = await this.roomsService.getRoomDetailById(roomId);

    // Verify user is host
    if (room.hostId !== user.id) {
      client.emit('room:error', { message: 'Chỉ host mới có thể bắt đầu ván đấu' });
      return;
    }

    // Require minimum 2 players
    if (room.playerCount < 2) {
      client.emit('room:error', { message: 'Cần ít nhất 2 người chơi' });
      return;
    }

    // Update room status to PLAYING
    await this.roomsService.updateRoomStatus(roomId, 'PLAYING');

    // Initialize game via GameGateway
    const players = room.players.map(p => ({
      userId: p.userId,
      username: p.username,
      seat: p.seat,
    }));
    await this.gameGateway.startNewGame(roomId, players);

    // Notify all players to transition to game page
    this.server.to(roomId).emit('room:gameStarting', {
      roomId: room.id,
      roomCode: room.roomCode,
    });
  }

  @SubscribeMessage('room:kick')
  async handleKickPlayer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const user = (client as any).user;
    const roomId = await this.redisService.getUserRoom(user.id);
    if (roomId) {
      // Only host can kick
      await this.roomsService.leaveRoom(data.userId, roomId);
      this.server.to(roomId).emit('room:playerKicked', { userId: data.userId });
    }
  }
}
