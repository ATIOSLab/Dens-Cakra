import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, raw, urlencoded, type Express } from 'express';
import helmet from 'helmet';
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
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.enableShutdownHooks();

  const expressApp = app.getHttpAdapter().getInstance() as Express;

  expressApp.set('trust proxy', 1);
  expressApp.all('/api/auth/{*any}', toNodeHandler(auth));
  expressApp.use(
    '/api/storage/uploads',
    raw({
      type: 'application/octet-stream',
      limit: env.storage.maxFileSizeBytes,
    }),
  );
  expressApp.use(json());
  expressApp.use(urlencoded({ extended: true }));

  if (env.apiDocsEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('DENS CAKRA Domain API')
      .setDescription(
        'DENS CAKRA v1 domain contract. Better Auth is mounted separately at /api/auth.',
      )
      .setVersion('1.0.0')
      .addCookieAuth(
        'denscakra.session_token',
        { type: 'apiKey', in: 'cookie' },
        'betterAuthCookie',
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      jsonDocumentUrl: 'api/docs/openapi.json',
      yamlDocumentUrl: 'api/docs/openapi.yaml',
    });
  }

  await app.listen(env.port);
}

void bootstrap();
