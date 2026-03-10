import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { customAlphabet } from 'nanoid';
import { Room, RoomPlayer } from './entities/room.entity';
import { RedisService } from '../redis/redis.service';

const generateRoomCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
    @InjectRepository(RoomPlayer)
    private readonly playerRepo: Repository<RoomPlayer>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Create a new room.
   * - Generate 6-char room code
   * - Add host as first player (seat 0)
   */
  async createRoom(userId: string, roomName?: string) {
    // Check user not already in another room
    const existingRoom = await this.redisService.getUserRoom(userId);
    if (existingRoom) {
      throw new ConflictException('Bạn đang trong phòng khác, hãy rời phòng trước');
    }

    // Generate unique room code (retry on collision)
    let roomCode: string;
    let attempts = 0;
    do {
      roomCode = generateRoomCode();
      const existing = await this.roomRepo.findOne({ where: { roomCode } });
      if (!existing) break;
      attempts++;
    } while (attempts < 3);

    // Create room
    const room = this.roomRepo.create({
      roomCode,
      roomName: roomName || `Phòng ${roomCode}`,
      hostId: userId,
      status: 'WAITING',
      playerCount: 1,
    });
    await this.roomRepo.save(room);

    // Add host as player
    const player = this.playerRepo.create({
      roomId: room.id,
      userId,
      seat: 0,
      isHost: true,
    });
    await this.playerRepo.save(player);

    // Track user-room mapping
    await this.redisService.setUserRoom(userId, room.id);

    return {
      roomId: room.id,
      roomCode: room.roomCode,
      roomName: room.roomName,
      inviteUrl: `/?room=${room.roomCode}`,
    };
  }

  /**
   * Join an existing room.
   * - Validate room exists and is WAITING
   * - Validate not full (< 4)
   * - Assign next available seat
   */
  async joinRoom(userId: string, roomCode: string) {
    const room = await this.roomRepo.findOne({ where: { roomCode } });
    if (!room) {
      throw new NotFoundException('Phòng không tồn tại');
    }

    if (room.status !== 'WAITING') {
      throw new BadRequestException('Ván đang diễn ra');
    }

    if (room.playerCount >= 4) {
      throw new BadRequestException('Phòng đã đủ người');
    }

    // Check if user already in this room (reconnect)
    const existing = await this.playerRepo.findOne({
      where: { roomId: room.id, userId },
    });
    if (existing) {
      return this.getRoomDetail(room.roomCode);
    }

    // Check user not in another room
    const otherRoom = await this.redisService.getUserRoom(userId);
    if (otherRoom && otherRoom !== room.id) {
      throw new ConflictException('Bạn đang trong phòng khác');
    }

    // Find available seat
    const takenSeats = await this.playerRepo.find({
      where: { roomId: room.id },
    });
    const takenSeatNumbers = takenSeats.map((p) => p.seat);
    const availableSeat = [0, 1, 2, 3].find(
      (s) => !takenSeatNumbers.includes(s),
    );

    if (availableSeat === undefined) {
      throw new BadRequestException('Phòng đã đủ người');
    }

    // Add player
    const player = this.playerRepo.create({
      roomId: room.id,
      userId,
      seat: availableSeat,
      isHost: false,
    });
    await this.playerRepo.save(player);

    // Update room player count
    room.playerCount += 1;
    await this.roomRepo.save(room);

    // Track user-room mapping
    await this.redisService.setUserRoom(userId, room.id);

    return this.getRoomDetail(room.roomCode);
  }

  /**
   * Get list of rooms with status WAITING.
   */
  async getRoomList() {
    const rooms = await this.roomRepo.find({
      where: { status: 'WAITING' },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    // Get host usernames
    const result: Array<{
      id: string;
      roomCode: string;
      roomName: string;
      hostUsername: string;
      playerCount: number;
      status: string;
    }> = [];
    for (const r of rooms) {
      const hostPlayer = await this.playerRepo.findOne({
        where: { roomId: r.id, isHost: true },
        relations: ['user'],
      });
      result.push({
        id: r.id,
        roomCode: r.roomCode,
        roomName: r.roomName,
        hostUsername: hostPlayer?.user?.username || 'Unknown',
        playerCount: r.playerCount,
        status: r.status,
      });
    }

    return result;
  }

  /**
   * Get room detail with player list.
   */
  async getRoomDetail(roomCode: string) {
    const room = await this.roomRepo.findOne({ where: { roomCode } });
    if (!room) {
      throw new NotFoundException('Phòng không tồn tại');
    }

    const players = await this.playerRepo.find({
      where: { roomId: room.id },
      relations: ['user'],
      order: { seat: 'ASC' },
    });

    return {
      id: room.id,
      roomCode: room.roomCode,
      roomName: room.roomName,
      hostId: room.hostId,
      status: room.status,
      playerCount: room.playerCount,
      players: players.map((p) => ({
        userId: p.userId,
        username: p.user?.username || 'Unknown',
        seat: p.seat,
        isHost: p.isHost,
      })),
    };
  }

  /**
   * Leave a room.
   * - Remove player
   * - Transfer host if needed
   * - Delete room if empty
   */
  async leaveRoom(userId: string, roomId: string) {
    const player = await this.playerRepo.findOne({
      where: { roomId, userId },
    });
    if (!player) {
      throw new NotFoundException('Bạn không trong phòng này');
    }

    await this.playerRepo.remove(player);
    await this.redisService.removeUserRoom(userId);

    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) return;

    room.playerCount -= 1;

    if (room.playerCount <= 0) {
      await this.roomRepo.remove(room);
      return { message: 'Phòng đã bị xóa (không còn người chơi)' };
    }

    // Transfer host if host left
    if (room.hostId === userId) {
      const nextHost = await this.playerRepo.findOne({
        where: { roomId },
        order: { seat: 'ASC' },
      });
      if (nextHost) {
        room.hostId = nextHost.userId;
        nextHost.isHost = true;
        await this.playerRepo.save(nextHost);
      }
    }

    await this.roomRepo.save(room);
    return { message: 'Đã rời phòng' };
  }

  /**
   * Get room detail by room ID (not code).
   * Used by GameGateway to get players for game init.
   */
  async getRoomDetailById(roomId: string) {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('Phòng không tồn tại');
    }

    const players = await this.playerRepo.find({
      where: { roomId: room.id },
      relations: ['user'],
      order: { seat: 'ASC' },
    });

    return {
      id: room.id,
      roomCode: room.roomCode,
      roomName: room.roomName,
      hostId: room.hostId,
      status: room.status,
      playerCount: room.playerCount,
      players: players.map((p) => ({
        userId: p.userId,
        username: p.user?.username || 'Unknown',
        seat: p.seat,
        isHost: p.isHost,
      })),
    };
  }

  /** Update room status (WAITING → PLAYING → FINISHED) */
  async updateRoomStatus(roomId: string, status: 'WAITING' | 'PLAYING' | 'FINISHED') {
    await this.roomRepo.update(roomId, { status });
  }
}
