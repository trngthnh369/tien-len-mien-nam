import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameSession, GameResult } from './entities/history.entity';

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(GameSession)
    private readonly sessionRepo: Repository<GameSession>,
    @InjectRepository(GameResult)
    private readonly resultRepo: Repository<GameResult>,
  ) {}

  /**
   * Create a new game session — called when a game starts.
   */
  async createSession(roomId: string, sessionNumber: number): Promise<string> {
    const session = this.sessionRepo.create({
      roomId,
      sessionNumber,
      startedAt: new Date(),
    });
    const saved = await this.sessionRepo.save(session);
    return saved.id;
  }

  /**
   * Finalize a game session — store results and end time.
   */
  async finalizeSession(sessionId: string, gameResults: Array<{ userId: string; rank: number }>) {
    // Update session end time
    await this.sessionRepo.update(sessionId, { endedAt: new Date() });

    // Store results
    for (const result of gameResults) {
      const gameResult = this.resultRepo.create({
        sessionId,
        userId: result.userId,
        rank: result.rank,
      });
      await this.resultRepo.save(gameResult);
    }
  }

  /**
   * Get all sessions for a room.
   */
  async getRoomSessions(roomId: string) {
    const sessions = await this.sessionRepo.find({
      where: { roomId },
      order: { sessionNumber: 'DESC' },
    });

    const sessionData: Array<{
      sessionId: string;
      sessionNumber: number;
      startedAt: Date;
      endedAt: Date | null;
      results: Array<{ userId: string; username: string; rank: number }>;
    }> = [];

    for (const session of sessions) {
      const sessionResults = await this.resultRepo.find({
        where: { sessionId: session.id },
        relations: ['user'],
        order: { rank: 'ASC' },
      });

      sessionData.push({
        sessionId: session.id,
        sessionNumber: session.sessionNumber,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        results: sessionResults.map((r) => ({
          userId: r.userId,
          username: r.user?.username || 'Unknown',
          rank: r.rank,
        })),
      });
    }

    return sessionData;
  }

  /**
   * Get next session number for a room.
   */
  async getNextSessionNumber(roomId: string): Promise<number> {
    const lastSession = await this.sessionRepo.findOne({
      where: { roomId },
      order: { sessionNumber: 'DESC' },
    });
    return (lastSession?.sessionNumber || 0) + 1;
  }
}
