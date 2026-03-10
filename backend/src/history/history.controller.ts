import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { HistoryService } from './history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  /** GET /history/:roomId — Get all sessions for a room */
  @Get(':roomId')
  getRoomSessions(@Param('roomId') roomId: string) {
    return this.historyService.getRoomSessions(roomId);
  }
}
