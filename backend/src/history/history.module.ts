import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { GameSession, GameResult, Message } from './entities/history.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameSession, GameResult, Message]),
    AuthModule,
  ],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class HistoryModule {}
