import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS for frontend
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3003',
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com')
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🃏 TienLen API running on port ${port}`);
}
bootstrap();
