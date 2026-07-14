import { StreamableFile } from '@nestjs/common';
import { jest } from '@jest/globals';
import { lastValueFrom, of } from 'rxjs';
import { ApiResponseInterceptor } from './api-response.interceptor.js';

describe('ApiResponseInterceptor', () => {
  it('serializes nested bigint values before Express JSON serialization', async () => {
    const interceptor = new ApiResponseInterceptor();
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ requestId: 'req-123' }),
        getResponse: () => ({ statusCode: 200, headersSent: false }),
      }),
    } as never;
    const next = {
      handle: jest.fn(() =>
        of({
          data: {
            productId: 'product-1',
            attachments: [
              {
                file: {
                  id: 'file-1',
                  sizeBytes: BigInt(2048),
                },
              },
            ],
          },
        }),
      ),
    };

    const result = await lastValueFrom(interceptor.intercept(context, next));

    expect(result).toEqual({
      success: true,
      data: {
        productId: 'product-1',
        attachments: [
          {
            file: {
              id: 'file-1',
              sizeBytes: '2048',
            },
          },
        ],
      },
      requestId: 'req-123',
      timestamp: expect.any(String),
    });
  });

  it('passes through streamable file responses unchanged', async () => {
    const interceptor = new ApiResponseInterceptor();
    const stream = new StreamableFile(Buffer.from('ok'));
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ requestId: 'req-123' }),
        getResponse: () => ({ statusCode: 200, headersSent: false }),
      }),
    } as never;
    const next = {
      handle: jest.fn(() => of(stream)),
    };

    const result = await lastValueFrom(interceptor.intercept(context, next));

    expect(result).toBe(stream);
  });
});
