import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { User } from '../auth/entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { GameSession, GameResult, Message } from './entities/history.entity';

function randomId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
    create: jest.fn((data: any) => ({ id: randomId(), ...data })),
    save: jest.fn((token: any) => { tokens.push(token); return Promise.resolve(token); }),
    delete: jest.fn(() => Promise.resolve({ affected: 1 })),
  };
}

function createMockSessionRepository() {
  const sessions: any[] = [];
  return {
    find: jest.fn(({ where }) => {
      if (where?.roomId) return Promise.resolve(sessions.filter(s => s.roomId === where.roomId));
      return Promise.resolve([]);
    }),
    findOne: jest.fn(({ where }) => {
      return Promise.resolve(sessions.find(s => s.id === where?.id || s.roomId === where?.roomId) || null);
    }),
    create: jest.fn((data: any) => ({ id: randomId(), ...data })),
    save: jest.fn((session: any) => { sessions.push(session); return Promise.resolve(session); }),
    update: jest.fn(() => Promise.resolve({ affected: 1 })),
  };
}

function createMockResultRepository() {
  const results: any[] = [];
  return {
    find: jest.fn(({ where }) => {
      if (where?.sessionId) return Promise.resolve(results.filter(r => r.sessionId === where.sessionId));
      return Promise.resolve([]);
    }),
    create: jest.fn((data: any) => ({ ...data })),
    save: jest.fn((result: any) => { results.push(result); return Promise.resolve(result); }),
  };
}

describe('History API (E2E)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'jwt_secret',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AuthController, HistoryController],
      providers: [
        AuthService,
        JwtStrategy,
        HistoryService,
        { provide: getRepositoryToken(User), useFactory: createMockUserRepository },
        { provide: getRepositoryToken(RefreshToken), useFactory: createMockTokenRepository },
        { provide: getRepositoryToken(GameSession), useFactory: createMockSessionRepository },
        { provide: getRepositoryToken(GameResult), useFactory: createMockResultRepository },
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
      .send({ username: 'histuser', password: 'password123' });
    accessToken = res.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== GET /history/:roomId ====================
  describe('GET /history/:roomId', () => {
    it('should return empty array for room with no sessions', async () => {
      const res = await request(app.getHttpServer())
        .get('/history/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('should reject without auth (401)', async () => {
      await request(app.getHttpServer())
        .get('/history/some-room-id')
        .expect(401);
    });
  });
});
