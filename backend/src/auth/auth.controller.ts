import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /auth/register — Create new user */
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /** POST /auth/login — Login with credentials */
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** POST /auth/refresh — Refresh access token */
  @Post('refresh')
  refresh(@Body('refreshToken') token: string) {
    return this.authService.refreshToken(token);
  }

  /** POST /auth/logout — Invalidate refresh token */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: any) {
    return this.authService.logout(req.user.id);
  }
}
