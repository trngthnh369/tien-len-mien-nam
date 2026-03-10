import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WsAuthGuard } from './ws-auth.guard';
import { RedisService } from '../redis/redis.service';
import { Message } from '../history/entities/history.entity';

/**
 * Chat Gateway — handles chat and emoji events.
 *
 * Events (client → server):
 * - chat:message   { content }
 * - chat:emoji     { emojiIndex }
 *
 * Events (server → client):
 * - chat:newMessage   { userId, username, content, type }
 * - chat:emojiReaction { userId, username, emojiIndex }
 */
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003'],
    credentials: true,
  },
})
@UseGuards(WsAuthGuard)
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly redisService: RedisService,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  /**
   * Join a chat room — required so messages can be broadcast to room members.
   */
  @SubscribeMessage('chat:join')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    if (data?.roomId) {
      client.join(data.roomId);
    }
  }

  /**
   * Send a text message in the room.
   */
  @SubscribeMessage('chat:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { content: string },
  ) {
    const user = (client as any).user;
    const roomId = await this.redisService.getUserRoom(user.id);
    if (!roomId) return;

    // Validate content length
    const content = (data.content || '').trim().slice(0, 200);
    if (!content) return;

    // Persist to database
    const message = this.messageRepo.create({
      roomId,
      userId: user.id,
      content,
      type: 'text',
    });
    await this.messageRepo.save(message);

    // Broadcast to room
    this.server.to(roomId).emit('chat:newMessage', {
      userId: user.id,
      username: user.username,
      content,
      type: 'text',
      createdAt: message.createdAt,
    });
  }

  /**
   * Send an emoji reaction (index 0-7 from EMOJI_REACTIONS).
   */
  @SubscribeMessage('chat:emoji')
  async handleEmoji(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { emojiIndex: number },
  ) {
    const user = (client as any).user;
    const roomId = await this.redisService.getUserRoom(user.id);
    if (!roomId) return;

    // Validate emoji index
    if (data.emojiIndex < 0 || data.emojiIndex > 7) return;

    // Broadcast emoji reaction (no persistence needed)
    this.server.to(roomId).emit('chat:emojiReaction', {
      userId: user.id,
      username: user.username,
      emojiIndex: data.emojiIndex,
    });
  }
}
