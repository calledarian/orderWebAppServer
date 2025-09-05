import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable JSON body parsing
  app.use(express.json());
  app.use('/orders', rateLimit({
    windowMs: 60 * 60 * 1000, // 30 hour
    max: 2,                   // max 1 request per window
    message: 'You can only place 2 order per hour',
    standardHeaders: true,
    legacyHeaders: false,
  }));
  app.use(helmet());


  // Enable CORS for your frontend or allow all origins for testing
  app.enableCors({
    // origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Use the port Render provides, fallback to 3001 locally
  const port = process.env.PORT || 3005;
  await app.listen(port);

  console.log(`NestJS server is running on port ${port}`);
}

bootstrap();
