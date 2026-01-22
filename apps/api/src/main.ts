import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { QUEUES } from './jobs/queues/queue.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: configService.get<string>('ALLOWED_ORIGINS')?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API Prefix
  app.setGlobalPrefix('api/v1');

  // Bull Board Dashboard
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const emailQueue = app.get(getQueueToken(QUEUES.EMAIL));
  const cleanupQueue = app.get(getQueueToken(QUEUES.CLEANUP));

  createBullBoard({
    queues: [new BullAdapter(emailQueue), new BullAdapter(cleanupQueue)],
    serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());

  const port = configService.get<number>('API_PORT') || 3000;
  await app.listen(port);

  console.log(`🚀 API running on: http://localhost:${port}`);
  console.log(`📚 Health check: http://localhost:${port}/api/v1/health`);
  console.log(`📊 Bull Board: http://localhost:${port}/admin/queues`);
}

bootstrap();
