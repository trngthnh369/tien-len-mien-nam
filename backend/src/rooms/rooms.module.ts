import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { Room, RoomPlayer } from './entities/room.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, RoomPlayer]),
    AuthModule,
  ],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
