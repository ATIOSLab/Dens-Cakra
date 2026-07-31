import { jest } from '@jest/globals';
import { BaketQueryService } from './baket-query.service.js';

describe('BaketQueryService detail serialization', () => {
  it('does not select BigInt sizeBytes for evidence files', async () => {
    type FindDetailInput = {
      include?: {
        versions?: {
          include?: {
            sourceMessages?: {
              include?: {
                message?: {
                  include?: {
                    media?: {
                      include?: {
                        file?: { select?: Record<string, boolean> };
                      };
                    };
                  };
                };
              };
            };
            attachments?: {
              include?: { file?: { select?: Record<string, boolean> } };
            };
          };
        };
      };
    };
    const findFirstOrThrow = jest.fn((input: FindDetailInput) => ({
      id: 'baket',
      input,
    }));
    const service = new BaketQueryService(
      { baket: { findFirstOrThrow } } as never,
      {} as never,
    );

    await service.baketDetail('baket');

    const query = findFirstOrThrow.mock.calls[0]?.[0];
    const versionInclude = query.include?.versions?.include;
    const sourceFileSelect =
      versionInclude?.sourceMessages?.include?.message?.include?.media?.include
        ?.file?.select;
    const attachmentFileSelect =
      versionInclude?.attachments?.include?.file?.select;

    expect(sourceFileSelect).toEqual(
      expect.objectContaining({ id: true, mimeType: true }),
    );
    expect(sourceFileSelect).not.toHaveProperty('sizeBytes');
    expect(attachmentFileSelect).not.toHaveProperty('sizeBytes');
  });

  it('applies category and Baket creation period filters', async () => {
    type FindManyInput = {
      where?: Record<string, unknown>;
    };
    const findMany = jest.fn((input: FindManyInput) => []);
    const count = jest.fn(() => 0);
    const service = new BaketQueryService(
      { baket: { findMany, count } } as never,
      { baketWhere: jest.fn(() => ({})) } as never,
    );

    await service.list(
      {
        page: 1,
        limit: 20,
        categoryId: '11111111-1111-4111-8111-111111111111',
        from: '2026-07-01T00:00:00.000+07:00',
        to: '2026-07-14T23:59:59.999+07:00',
      },
      { roleCode: 'FIELD_OFFICER' } as never,
    );

    const query = findMany.mock.calls[0]?.[0];
    expect(query.where).toEqual(
      expect.objectContaining({
        reportCategoryId: '11111111-1111-4111-8111-111111111111',
        createdAt: {
          gte: new Date('2026-07-01T00:00:00.000+07:00'),
          lte: new Date('2026-07-14T23:59:59.999+07:00'),
        },
      }),
    );
  });
});
