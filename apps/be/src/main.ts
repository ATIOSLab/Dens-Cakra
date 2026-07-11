import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, static as serveStatic, urlencoded, type Express } from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { toNodeHandler } from 'better-auth/node';
import { AppModule } from './app.module.js';
import { auth } from './lib/auth.js';
import { env } from './lib/env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    cors: {
      credentials: true,
      origin: env.corsOrigins,
    },
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix('v1');

  const expressApp = app.getHttpAdapter().getInstance() as Express;

  expressApp.set('trust proxy', 1);
  expressApp.all('/api/auth/{*any}', toNodeHandler(auth));
  expressApp.use('/uploads', serveStatic(join(process.cwd(), 'uploads')));
  expressApp.use(json());
  expressApp.use(urlencoded({ extended: true }));

  await app.listen(env.port);
}

void bootstrap();
