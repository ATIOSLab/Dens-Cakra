import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.DATABASE_URL ??=
      'postgresql://postgres:postgres@localhost:5432/denscakra_db?schema=public';
    process.env.BETTER_AUTH_SECRET ??=
      'dev-only-secret-key-for-tests-minimum-32';
    process.env.BETTER_AUTH_URL ??= 'http://localhost:3001';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
  });

  it('/v1/health (GET)', () => {
    const server = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    return request(server)
      .get('/v1/health')
      .expect(200)
      .expect((response: Response) => {
        const body = response.body as { status: string };
        expect(body.status).toBe('ok');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
