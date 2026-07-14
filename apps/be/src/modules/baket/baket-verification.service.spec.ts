import { jest } from '@jest/globals';
import {
  InformationCredibility,
  SourceReliability,
  VerificationStatus,
} from '../../generated/prisma/client.js';
import { BaketVerificationService } from './baket-verification.service.js';

describe('BaketVerificationService matrix completion', () => {
  it('completes verification from A-F and 1-6 scores without checklist', async () => {
    const verification = {
      id: 'verification-id',
      status: VerificationStatus.IN_PROGRESS,
      sourceReliability: SourceReliability.A,
      informationCredibility: InformationCredibility.ONE,
      summary: 'Sumber dan informasi dapat dipercaya.',
      baketVersion: {
        id: 'version-id',
        baketId: 'baket-id',
      },
    };
    const tx = {
      baketVerification: { update: jest.fn() },
      baket: { update: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const query = {
      verificationDetail: jest.fn(() => verification),
    };
    const service = new BaketVerificationService(
      prisma as never,
      query as never,
      {} as never,
    );

    const result = await service.completeVerification('verification-id', {
      decision: 'VERIFIED',
      summary: verification.summary,
    });

    expect(result).toBe(verification);
    expect(tx.baketVerification.update).toHaveBeenCalledTimes(1);
    expect(tx.baket.update).toHaveBeenCalledTimes(1);
  });
});
