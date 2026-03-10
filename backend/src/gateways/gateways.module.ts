import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomGateway } from './room.gateway';
import { GameGateway } from './game.gateway';
import { ChatGateway } from './chat.gateway';
import { WsAuthGuard } from './ws-auth.guard';
import { RoomsModule } from '../rooms/rooms.module';
import { HistoryModule } from '../history/history.module';
import { AuthModule } from '../auth/auth.module';
import { Message } from '../history/entities/history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message]),
    AuthModule,
    RoomsModule,
    HistoryModule,
  ],
  providers: [RoomGateway, GameGateway, ChatGateway, WsAuthGuard],
})
export class GatewaysModule {}
