import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_GAME_TTL } from '../game/core/constants';
import type { GameState } from '../game/core/types';

/**
 * Redis service for ephemeral game state storage.
 *
 * Key structure:
 * - game:{roomId}          → GameState JSON (TTL 4 hours)
 * - user:room:{userId}     → roomId (TTL 4 hours)
 * - room:sockets:{roomId}  → Set of socketIds (TTL 4 hours)
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    this.client = redisUrl
      ? new Redis(redisUrl)
      : new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          retryStrategy: (times) => Math.min(times * 50, 2000),
        });
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  // ========== Game State ==========

  /** Store game state in Redis with TTL */
  async setGameState(roomId: string, state: GameState): Promise<void> {
    await this.client.setex(
      `game:${roomId}`,
      REDIS_GAME_TTL,
      JSON.stringify(state),
    );
  }

  /** Retrieve game state from Redis */
  async getGameState(roomId: string): Promise<GameState | null> {
    const data = await this.client.get(`game:${roomId}`);
    return data ? JSON.parse(data) : null;
  }

  /** Delete game state (after game ends) */
  async deleteGameState(roomId: string): Promise<void> {
    await this.client.del(`game:${roomId}`);
  }

  // ========== User-Room Mapping ==========

  /** Track which room a user is currently in */
  async setUserRoom(userId: string, roomId: string): Promise<void> {
    await this.client.setex(`user:room:${userId}`, REDIS_GAME_TTL, roomId);
  }

  /** Get user's current room */
  async getUserRoom(userId: string): Promise<string | null> {
    return this.client.get(`user:room:${userId}`);
  }

  /** Remove user-room mapping */
  async removeUserRoom(userId: string): Promise<void> {
    await this.client.del(`user:room:${userId}`);
  }

  // ========== Socket Tracking ==========

  /** Add a socket ID to a room's socket set */
  async addRoomSocket(roomId: string, socketId: string): Promise<void> {
    await this.client.sadd(`room:sockets:${roomId}`, socketId);
    await this.client.expire(`room:sockets:${roomId}`, REDIS_GAME_TTL);
  }

  /** Remove a socket ID from a room */
  async removeRoomSocket(roomId: string, socketId: string): Promise<void> {
    await this.client.srem(`room:sockets:${roomId}`, socketId);
  }

  /** Get all socket IDs in a room */
  async getRoomSockets(roomId: string): Promise<string[]> {
    return this.client.smembers(`room:sockets:${roomId}`);
  }

  /** Clear all sockets for a room */
  async clearRoomSockets(roomId: string): Promise<void> {
    await this.client.del(`room:sockets:${roomId}`);
  }

  // ========== User-Socket Mapping (per namespace) ==========

  /** Map userId to their game namespace socketId */
  async setUserGameSocket(userId: string, socketId: string): Promise<void> {
    await this.client.setex(`user:gamesocket:${userId}`, REDIS_GAME_TTL, socketId);
  }

  /** Get user's game namespace socketId */
  async getUserGameSocket(userId: string): Promise<string | null> {
    return this.client.get(`user:gamesocket:${userId}`);
  }

  /** Remove user's game socket mapping */
  async removeUserGameSocket(userId: string): Promise<void> {
    await this.client.del(`user:gamesocket:${userId}`);
  }
}
