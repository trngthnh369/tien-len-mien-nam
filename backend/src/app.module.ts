import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { RoomsModule } from './rooms/rooms.module';
import { HistoryModule } from './history/history.module';
import { RedisModule } from './redis/redis.module';
import { GatewaysModule } from './gateways/gateways.module';

@Module({
  imports: [
    // PostgreSQL connection
    TypeOrmModule.forRoot(
      process.env.DATABASE_URL
        ? {
            type: 'postgres',
            url: process.env.DATABASE_URL,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true,
            ssl: { rejectUnauthorized: false },
          }
        : {
            type: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            username: process.env.DB_USER || 'tienlen',
            password: process.env.DB_PASS || 'tienlen_pass',
            database: process.env.DB_NAME || 'tienlen',
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true,
          },
    ),
    RedisModule,
    AuthModule,
    RoomsModule,
    HistoryModule,
    GatewaysModule,
  ],
})
export class AppModule {}
