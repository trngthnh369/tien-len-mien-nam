import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  /** POST /rooms — Create a new room */
  @Post()
  createRoom(@Req() req: any, @Body('roomName') roomName?: string) {
    return this.roomsService.createRoom(req.user.id, roomName);
  }

  /** POST /rooms/join — Join a room by code */
  @Post('join')
  joinRoom(@Req() req: any, @Body('roomCode') roomCode: string) {
    return this.roomsService.joinRoom(req.user.id, roomCode);
  }

  /** GET /rooms — List waiting rooms */
  @Get()
  getRoomList() {
    return this.roomsService.getRoomList();
  }

  /** GET /rooms/:code — Get room detail */
  @Get(':code')
  getRoomDetail(@Param('code') code: string) {
    return this.roomsService.getRoomDetail(code);
  }

  /** DELETE /rooms/:roomId/leave — Leave room */
  @Delete(':roomId/leave')
  leaveRoom(@Req() req: any, @Param('roomId') roomId: string) {
    return this.roomsService.leaveRoom(req.user.id, roomId);
  }
}
