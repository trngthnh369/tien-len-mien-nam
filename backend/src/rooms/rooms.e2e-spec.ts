import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RedisService } from '../redis/redis.service';
import { User } from '../auth/entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Room, RoomPlayer } from './entities/room.entity';

function randomId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ===== Mock Repositories =====
function createMockUserRepository() {
  const users: any[] = [];
  return {
    findOne: jest.fn(({ where }) => {
      if (where.id) return Promise.resolve(users.find(u => u.id === where.id) || null);
      if (where.username) return Promise.resolve(users.find(u => u.username === where.username) || null);
      return Promise.resolve(null);
    }),
    create: jest.fn((data: any) => ({ id: randomId(), ...data, createdAt: new Date() })),
    save: jest.fn((user: any) => {
      const idx = users.findIndex(u => u.id === user.id);
      if (idx >= 0) users[idx] = user;
      else users.push(user);
      return Promise.resolve(user);
    }),
  };
}

function createMockTokenRepository() {
  const tokens: any[] = [];
  return {
    findOne: jest.fn(({ where }) => {
      if (where.userId) return Promise.resolve(tokens.find(t => t.userId === where.userId) || null);
      return Promise.resolve(null);
    }),
    create: jest.fn((data: any) => ({ id: randomId(), ...data, createdAt: new Date() })),
    save: jest.fn((token: any) => { tokens.push(token); return Promise.resolve(token); }),
    delete: jest.fn(() => Promise.resolve({ affected: 1 })),
  };
}

function createMockRoomRepository() {
  const rooms: any[] = [];
  return {
    findOne: jest.fn(({ where }) => {
      if (where.id) return Promise.resolve(rooms.find(r => r.id === where.id) || null);
      if (where.roomCode) return Promise.resolve(rooms.find(r => r.roomCode === where.roomCode) || null);
      return Promise.resolve(null);
    }),
    find: jest.fn(({ where }) => {
      if (where?.status) return Promise.resolve(rooms.filter(r => r.status === where.status).slice(0, 50));
      return Promise.resolve(rooms);
    }),
    create: jest.fn((data: any) => ({ id: randomId(), ...data, createdAt: new Date() })),
    save: jest.fn((room: any) => {
      const idx = rooms.findIndex(r => r.id === room.id);
      if (idx >= 0) rooms[idx] = room;
      else rooms.push(room);
      return Promise.resolve(room);
    }),
    update: jest.fn((id, data) => {
      const idx = rooms.findIndex(r => r.id === id);
      if (idx >= 0) Object.assign(rooms[idx], data);
      return Promise.resolve({ affected: idx >= 0 ? 1 : 0 });
    }),
    remove: jest.fn((room: any) => {
      const idx = rooms.findIndex(r => r.id === room.id);
      if (idx >= 0) rooms.splice(idx, 1);
      return Promise.resolve(room);
    }),
  };
}

function createMockRoomPlayerRepository() {
  const players: any[] = [];
  return {
    findOne: jest.fn(({ where, relations, order }) => {
      let found = players.filter(p => {
        if (where.roomId && p.roomId !== where.roomId) return false;
        if (where.userId && p.userId !== where.userId) return false;
        if (where.isHost !== undefined && p.isHost !== where.isHost) return false;
        return true;
      });
      if (order?.seat === 'ASC') found = found.sort((a, b) => a.seat - b.seat);
      const p = found[0] || null;
      // Mock user relation
      if (p && relations?.includes('user')) {
        p.user = { username: p._username || 'Unknown' };
      }
      return Promise.resolve(p);
    }),
    find: jest.fn(({ where, relations, order }) => {
      let found = players.filter(p => {
        if (where.roomId && p.roomId !== where.roomId) return false;
        return true;
      });
      if (order?.seat === 'ASC') found = found.sort((a, b) => a.seat - b.seat);
      // Mock user relation
      if (relations?.includes('user')) {
        found.forEach(p => { p.user = { username: p._username || 'Unknown' }; });
      }
      return Promise.resolve(found);
    }),
    create: jest.fn((data: any) => ({ ...data, joinedAt: new Date() })),
    save: jest.fn((player: any) => {
      const idx = players.findIndex(p => p.roomId === player.roomId && p.userId === player.userId);
      if (idx >= 0) players[idx] = player;
      else players.push(player);
      return Promise.resolve(player);
    }),
    remove: jest.fn((player: any) => {
      const idx = players.findIndex(p => p.roomId === player.roomId && p.userId === player.userId);
      if (idx >= 0) players.splice(idx, 1);
      return Promise.resolve(player);
    }),
  };
}

// ===== MockRedisService =====
class MockRedisService {
  private userRooms = new Map<string, string>();
  async setUserRoom(userId: string, roomId: string) { this.userRooms.set(userId, roomId); }
  async getUserRoom(userId: string): Promise<string | null> { return this.userRooms.get(userId) || null; }
  async removeUserRoom(userId: string) { this.userRooms.delete(userId); }
  async addRoomSocket() {}
  async removeRoomSocket() {}
  async getRoomSockets(): Promise<string[]> { return []; }
  async clearRoomSockets() {}
  async setGameState() {}
  async getGameState() { return null; }
  async deleteGameState() {}
  async setUserGameSocket() {}
  async getUserGameSocket() { return null; }
  async removeUserGameSocket() {}
  onModuleDestroy() {}
}

// Store registered users for helper function
let registeredUsers: Array<{ token: string; userId: string; username: string }> = [];

describe('Rooms API (E2E)', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    registeredUsers = [];

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'jwt_secret',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AuthController, RoomsController],
      providers: [
        AuthService,
        JwtStrategy,
        RoomsService,
        { provide: getRepositoryToken(User), useFactory: createMockUserRepository },
        { provide: getRepositoryToken(RefreshToken), useFactory: createMockTokenRepository },
        { provide: getRepositoryToken(Room), useFactory: createMockRoomRepository },
        { provide: getRepositoryToken(RoomPlayer), useFactory: createMockRoomPlayerRepository },
        { provide: RedisService, useClass: MockRedisService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // Register a test user
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: 'roomhost', password: 'password123' });
    accessToken = res.body.accessToken;
    userId = res.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  async function registerUser(username: string) {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username, password: 'password123' });
    return { token: res.body.accessToken, userId: res.body.user.id };
  }

  // ==================== POST /rooms — Create Room ====================
  describe('POST /rooms', () => {
    it('should create a room when authenticated', async () => {
      const res = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ roomName: 'Test Room' })
        .expect(201);

      expect(res.body).toHaveProperty('roomId');
      expect(res.body).toHaveProperty('roomCode');
      expect(res.body.roomCode).toHaveLength(6);
      expect(res.body.roomName).toBe('Test Room');
    });

    it('should create room with default name', async () => {
      const user2 = await registerUser('nonameusr');
      const res = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${user2.token}`)
        .send({})
        .expect(201);

      expect(res.body.roomName).toContain('Phòng');
    });

    it('should reject without auth (401)', async () => {
      await request(app.getHttpServer())
        .post('/rooms')
        .send({ roomName: 'No Auth' })
        .expect(401);
    });
  });

  // ==================== POST /rooms/join — Join Room ====================
  describe('POST /rooms/join', () => {
    let roomCode: string;

    beforeAll(async () => {
      const creator = await registerUser('joincrt');
      const res = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${creator.token}`)
        .send({ roomName: 'Join Test' });
      roomCode = res.body.roomCode;
    });

    it('should join room by code', async () => {
      const joiner = await registerUser('joiner1');
      const res = await request(app.getHttpServer())
        .post('/rooms/join')
        .set('Authorization', `Bearer ${joiner.token}`)
        .send({ roomCode })
        .expect(201);

      expect(res.body).toHaveProperty('players');
    });

    it('should reject non-existent room (404)', async () => {
      const joiner = await registerUser('joiner2');
      await request(app.getHttpServer())
        .post('/rooms/join')
        .set('Authorization', `Bearer ${joiner.token}`)
        .send({ roomCode: 'XXXXXX' })
        .expect(404);
    });

    it('should reject without auth (401)', async () => {
      await request(app.getHttpServer())
        .post('/rooms/join')
        .send({ roomCode })
        .expect(401);
    });
  });

  // ==================== GET /rooms — List Rooms ====================
  describe('GET /rooms', () => {
    it('should list waiting rooms', async () => {
      const res = await request(app.getHttpServer())
        .get('/rooms')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should reject without auth (401)', async () => {
      await request(app.getHttpServer())
        .get('/rooms')
        .expect(401);
    });
  });

  // ==================== GET /rooms/:code — Room Detail ====================
  describe('GET /rooms/:code', () => {
    it('should get room detail', async () => {
      const creator = await registerUser('detailcr');
      const createRes = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${creator.token}`)
        .send({ roomName: 'Detail Room' });

      const res = await request(app.getHttpServer())
        .get(`/rooms/${createRes.body.roomCode}`)
        .set('Authorization', `Bearer ${creator.token}`)
        .expect(200);

      expect(res.body.roomCode).toBe(createRes.body.roomCode);
      expect(res.body.roomName).toBe('Detail Room');
    });

    it('should 404 for non-existent code', async () => {
      await request(app.getHttpServer())
        .get('/rooms/ZZZZZZ')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // ==================== DELETE /rooms/:roomId/leave ====================
  describe('DELETE /rooms/:roomId/leave', () => {
    it('should leave a room', async () => {
      const creator = await registerUser('leavecrt');
      const joiner = await registerUser('leavejnr');

      const createRes = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${creator.token}`)
        .send({ roomName: 'Leave Room' });

      await request(app.getHttpServer())
        .post('/rooms/join')
        .set('Authorization', `Bearer ${joiner.token}`)
        .send({ roomCode: createRes.body.roomCode });

      const res = await request(app.getHttpServer())
        .delete(`/rooms/${createRes.body.roomId}/leave`)
        .set('Authorization', `Bearer ${joiner.token}`)
        .expect(200);

      expect(res.body.message).toContain('rời');
    });

    it('should delete room when last player leaves', async () => {
      const solo = await registerUser('soloplyr');
      const createRes = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${solo.token}`)
        .send({ roomName: 'Solo Room' });

      const res = await request(app.getHttpServer())
        .delete(`/rooms/${createRes.body.roomId}/leave`)
        .set('Authorization', `Bearer ${solo.token}`)
        .expect(200);

      expect(res.body.message).toContain('xóa');
    });

    it('should 404 when not in room', async () => {
      const outsider = await registerUser('outsider');
      await request(app.getHttpServer())
        .delete('/rooms/00000000-fake-0000-0000-000000000000/leave')
        .set('Authorization', `Bearer ${outsider.token}`)
        .expect(404);
    });
  });
});
