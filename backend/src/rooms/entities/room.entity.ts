import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'room_code', type: 'varchar', length: 6, unique: true })
  roomCode: string;

  @Column({ name: 'room_name', type: 'varchar', length: 30, nullable: true })
  roomName: string;

  @Column({ name: 'host_id', type: 'uuid' })
  hostId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'host_id' })
  host: User;

  @Column({ type: 'varchar', length: 20, default: 'WAITING' })
  status: 'WAITING' | 'PLAYING' | 'FINISHED';

  @Column({ name: 'player_count', type: 'int', default: 1 })
  playerCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('room_players')
export class RoomPlayer {
  @Column({ name: 'room_id', type: 'uuid', primary: true })
  roomId: string;

  @Column({ name: 'user_id', type: 'uuid', primary: true })
  userId: string;

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int' })
  seat: number;

  @Column({ name: 'is_host', type: 'boolean', default: false })
  isHost: boolean;

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt: Date;
}
