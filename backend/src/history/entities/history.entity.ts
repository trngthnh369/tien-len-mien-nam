import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Room } from '../../rooms/entities/room.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('game_sessions')
export class GameSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId: string;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ name: 'session_number', type: 'int' })
  sessionNumber: number;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date;
}

@Entity('game_results')
export class GameResult {
  @Column({ name: 'session_id', type: 'uuid', primary: true })
  sessionId: string;

  @Column({ name: 'user_id', type: 'uuid', primary: true })
  userId: string;

  @ManyToOne(() => GameSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: GameSession;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int' })
  rank: number;
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 200, nullable: true })
  content: string;

  @Column({ type: 'varchar', length: 10, default: 'text' })
  type: 'text' | 'system';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
