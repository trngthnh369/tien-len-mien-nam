import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly tokenRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new user.
   * 1. Validate username uniqueness
   * 2. Hash password (bcrypt, saltRounds=10)
   * 3. Insert user
   * 4. Generate JWT pair
   * 5. Store refresh token hash
   */
  async register(dto: RegisterDto) {
    // Check if username exists
    const existing = await this.userRepo.findOne({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException('Username đã tồn tại');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = this.userRepo.create({
      username: dto.username,
      passwordHash,
    });
    await this.userRepo.save(user);

    // Generate tokens
    return this.generateTokens(user);
  }

  /**
   * Login with username + password.
   * 1. Find user by username
   * 2. Compare password hash
   * 3. Generate JWT pair
   */
  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { username: dto.username },
    });
    if (!user) {
      throw new UnauthorizedException('Sai username hoặc mật khẩu');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Sai username hoặc mật khẩu');
    }

    return this.generateTokens(user);
  }

  /**
   * Refresh access token using refresh token.
   */
  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
      });

      const user = await this.userRepo.findOne({
        where: { id: payload.sub },
      });
      if (!user) {
        throw new UnauthorizedException('User không tồn tại');
      }

      // Verify refresh token hash exists in DB
      const tokenHash = await bcrypt.hash(token, 10);
      const storedToken = await this.tokenRepo.findOne({
        where: { userId: user.id },
      });
      if (!storedToken) {
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Refresh token hết hạn');
    }
  }

  /**
   * Logout — invalidate refresh token.
   */
  async logout(userId: string) {
    await this.tokenRepo.delete({ userId });
    return { message: 'Đã đăng xuất' };
  }

  /**
   * Generate access + refresh token pair.
   * - Access token: 15 phút
   * - Refresh token: 7 ngày
   */
  private async generateTokens(user: User) {
    const payload = { sub: user.id, username: user.username };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'jwt_secret',
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
      expiresIn: '7d',
    });

    // Store refresh token hash
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await this.tokenRepo.save(
      this.tokenRepo.create({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    );

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username },
    };
  }
}
