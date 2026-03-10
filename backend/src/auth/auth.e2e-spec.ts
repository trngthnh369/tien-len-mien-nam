import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

// ===== In-memory mock repositories =====
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
      const existing = users.findIndex(u => u.id === user.id);
      if (existing >= 0) users[existing] = user;
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
    save: jest.fn((token: any) => {
      tokens.push(token);
      return Promise.resolve(token);
    }),
    delete: jest.fn(({ userId }) => {
      const before = tokens.length;
      const remaining = tokens.filter(t => t.userId !== userId);
      tokens.length = 0;
      tokens.push(...remaining);
      return Promise.resolve({ affected: before - remaining.length });
    }),
  };
}

function randomId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

describe('Auth API (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'jwt_secret',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        { provide: getRepositoryToken(User), useFactory: createMockUserRepository },
        { provide: getRepositoryToken(RefreshToken), useFactory: createMockTokenRepository },
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
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== POST /auth/register ====================
  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'testuser', password: 'password123' })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.username).toBe('testuser');
    });

    it('should reject duplicate username (409)', async () => {
      // First register
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'dupuser', password: 'password123' })
        .expect(201);

      // Try to register again with same username
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'dupuser', password: 'password456' })
        .expect(409);

      expect(res.body.message).toContain('tồn tại');
    });

    it('should reject username too short (< 3 chars)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'ab', password: 'password123' })
        .expect(400);
    });

    it('should reject username too long (> 20 chars)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'a'.repeat(21), password: 'password123' })
        .expect(400);
    });

    it('should reject password too short (< 6 chars)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'validuser', password: '12345' })
        .expect(400);
    });

    it('should reject empty body', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({})
        .expect(400);
    });

    it('should reject extra fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'hacker', password: 'password123', role: 'admin' })
        .expect(400);
    });
  });

  // ==================== POST /auth/login ====================
  describe('POST /auth/login', () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'loginuser', password: 'correctpass' });
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'loginuser', password: 'correctpass' })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.username).toBe('loginuser');
    });

    it('should reject wrong password (401)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'loginuser', password: 'wrongpass' })
        .expect(401);

      expect(res.body.message).toContain('Sai');
    });

    it('should reject non-existent user (401)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'ghostuser', password: 'anypass' })
        .expect(401);

      expect(res.body.message).toContain('Sai');
    });
  });

  // ==================== POST /auth/refresh ====================
  describe('POST /auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'rfshuser', password: 'password123' })
        .expect(201);

      const { refreshToken } = registerRes.body;

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token (401)', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);
    });
  });

  // ==================== POST /auth/logout ====================
  describe('POST /auth/logout', () => {
    it('should logout with valid JWT', async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'lgoutuser', password: 'password123' })
        .expect(201);

      const { accessToken } = registerRes.body;

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body.message).toContain('đăng xuất');
    });

    it('should reject logout without token (401)', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });
  });
});
