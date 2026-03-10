import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * WebSocket authentication guard.
 * Validates JWT token from socket handshake auth.
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const token = client.handshake?.auth?.token;

    if (!token) {
      throw new WsException('Token không được cung cấp');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'jwt_secret',
      });
      // Attach user info to socket data
      (client as any).user = {
        id: payload.sub,
        username: payload.username,
      };
      return true;
    } catch {
      throw new WsException('Token không hợp lệ hoặc đã hết hạn');
    }
  }
}
