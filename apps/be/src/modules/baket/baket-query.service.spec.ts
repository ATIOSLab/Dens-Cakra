import { jest } from '@jest/globals';
import { BaketQueryService } from './baket-query.service.js';

describe('BaketQueryService detail serialization', () => {
  it('does not select BigInt sizeBytes for evidence files', async () => {
    const findFirstOrThrow = jest.fn(() => ({ id: 'baket' }));
    const service = new BaketQueryService(
      { baket: { findFirstOrThrow } } as never,
      {} as never,
    );

    await service.baketDetail('baket');

    const query = findFirstOrThrow.mock.calls[0]?.[0] as {
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
});
