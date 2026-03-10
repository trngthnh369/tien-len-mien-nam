import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from './ws-auth.guard';
import { RedisService } from '../redis/redis.service';
import { HistoryService } from '../history/history.service';
import { RoomsService } from '../rooms/rooms.service';
import { initGameState, applyAction, finalizeGame, maskStateForPlayer } from '../game/core/game-state';
import type { Card, GameState } from '../game/core/types';

/**
 * Game Gateway — handles gameplay real-time events.
 *
 * Events (client → server):
 * - game:join       { roomId }
 * - game:play       { cards: Card[] }
 * - game:pass       { }
 * - game:reconnect  { roomId }
 *
 * Events (server → client):
 * - game:state      { GameState (masked per player) }
 * - game:played     { userId, cards }
 * - game:passed     { userId }
 * - game:turnChange { currentTurn }
 * - game:finished   { results }
 * - game:error      { message }
 */
@WebSocketGateway({
  namespace: '/game',
  cors: {
    origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003'],
    credentials: true,
  },
})
@UseGuards(WsAuthGuard)
export class GameGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly redisService: RedisService,
    private readonly historyService: HistoryService,
    private readonly roomsService: RoomsService,
  ) {}

  // ========== Helper: Emit masked state to each player individually ==========

  /**
   * Sends each player their own masked game state via their personal socket.
   * This prevents any player from seeing another player's cards.
   */
  private async emitMaskedStates(roomId: string, state: GameState) {
    for (const player of state.players) {
      const socketId = await this.redisService.getUserGameSocket(player.userId);
      if (socketId) {
        const masked = maskStateForPlayer(state, player.userId);
        this.server.to(socketId).emit('game:state', masked);
      }
    }
  }

  // ========== Event Handlers ==========

  /**
   * Player joins the game channel — store socket mapping and send masked state.
   */
  @SubscribeMessage('game:join')
  async handleJoinGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const user = (client as any).user;
    client.join(data.roomId);

    // Store userId → socketId mapping for per-player emit
    await this.redisService.setUserGameSocket(user.id, client.id);

    const state = await this.redisService.getGameState(data.roomId);
    if (!state) {
      client.emit('game:error', { message: 'Game chưa bắt đầu' });
      return;
    }

    // Send masked state ONLY to this player
    const maskedState = maskStateForPlayer(state, user.id);
    client.emit('game:state', maskedState);
  }

  /**
   * Initialize a new game for a room.
   * Called by RoomGateway when host starts the game.
   */
  async startNewGame(roomId: string, players: Array<{ userId: string; username: string; seat: number }>) {
    const state = initGameState(roomId, players);

    // Create ONE session in history (will be finalized when game ends)
    const sessionNumber = await this.historyService.getNextSessionNumber(roomId);
    const sessionId = await this.historyService.createSession(roomId, sessionNumber);
    state.sessionId = sessionId;

    await this.redisService.setGameState(roomId, state);

    // Send masked state to each player individually
    await this.emitMaskedStates(roomId, state);

    return state;
  }

  /**
   * Play cards — validate, apply, and broadcast result.
   */
  @SubscribeMessage('game:play')
  async handlePlayCards(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { cards: Card[] },
  ) {
    const user = (client as any).user;
    const roomId = await this.redisService.getUserRoom(user.id);
    if (!roomId) {
      client.emit('game:error', { message: 'Bạn không trong phòng nào' });
      return;
    }

    const state = await this.redisService.getGameState(roomId);
    if (!state) {
      client.emit('game:error', { message: 'Game không tồn tại' });
      return;
    }

    // Apply action
    const result = applyAction(state, {
      type: 'PLAY',
      userId: user.id,
      cards: data.cards,
    });

    if ('error' in result && !result.state) {
      client.emit('game:error', { message: result.error });
      return;
    }

    const newState = result.state!;
    await this.redisService.setGameState(roomId, newState);

    // Broadcast the play to all in room
    this.server.to(roomId).emit('game:played', {
      userId: user.id,
      cards: data.cards,
    });

    // Check if game is finished
    if (newState.status === 'FINISHED') {
      const results = finalizeGame(newState);
      this.server.to(roomId).emit('game:finished', { results });

      // Finalize the EXISTING session (not create a new one)
      if (newState.sessionId) {
        await this.historyService.finalizeSession(newState.sessionId, results);
      }

      // Reset room status to WAITING so players can play again
      await this.roomsService.updateRoomStatus(roomId, 'WAITING');

      // Clean up Redis game state
      await this.redisService.deleteGameState(roomId);
    } else {
      // Broadcast turn change
      this.server.to(roomId).emit('game:turnChange', {
        currentTurn: newState.currentTurn,
      });

      // Send masked state to each player individually
      await this.emitMaskedStates(roomId, newState);
    }
  }

  /**
   * Pass turn — validate, apply, and broadcast.
   */
  @SubscribeMessage('game:pass')
  async handlePass(@ConnectedSocket() client: Socket) {
    const user = (client as any).user;
    const roomId = await this.redisService.getUserRoom(user.id);
    if (!roomId) {
      client.emit('game:error', { message: 'Bạn không trong phòng nào' });
      return;
    }

    const state = await this.redisService.getGameState(roomId);
    if (!state) {
      client.emit('game:error', { message: 'Game không tồn tại' });
      return;
    }

    const result = applyAction(state, {
      type: 'PASS',
      userId: user.id,
    });

    if ('error' in result && !result.state) {
      client.emit('game:error', { message: result.error });
      return;
    }

    const newState = result.state!;
    await this.redisService.setGameState(roomId, newState);

    // Broadcast pass and turn change
    this.server.to(roomId).emit('game:passed', { userId: user.id });
    this.server.to(roomId).emit('game:turnChange', {
      currentTurn: newState.currentTurn,
    });

    // Send masked state to each player individually (FIX: was missing)
    await this.emitMaskedStates(roomId, newState);
  }

  /**
   * Reconnect to an ongoing game.
   */
  @SubscribeMessage('game:reconnect')
  async handleReconnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const user = (client as any).user;
    client.join(data.roomId);

    // Update socket mapping for reconnected user
    await this.redisService.setUserGameSocket(user.id, client.id);

    const state = await this.redisService.getGameState(data.roomId);
    if (state) {
      const maskedState = maskStateForPlayer(state, user.id);
      client.emit('game:state', maskedState);
    } else {
      client.emit('game:error', { message: 'Game đã kết thúc hoặc không tồn tại' });
    }
  }
}
