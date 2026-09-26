import { jest } from '@jest/globals';
import {
  resolveDescendantAreaIds,
  resolveAncestorAreaIds,
  resolveHierarchicalAreaIds,
} from './area-closure.js';

describe('resolveDescendantAreaIds', () => {
  it('returns empty array when input is null, undefined, or empty', async () => {
    const prisma = {
      administrativeAreaClosure: {
        findMany: jest.fn(),
      },
    };

    expect(await resolveDescendantAreaIds(prisma, null)).toEqual([]);
    expect(await resolveDescendantAreaIds(prisma, undefined)).toEqual([]);
    expect(await resolveDescendantAreaIds(prisma, [])).toEqual([]);
    expect(prisma.administrativeAreaClosure.findMany).not.toHaveBeenCalled();
  });

  it('resolves descendants and includes original IDs without duplicates', async () => {
    const prisma = {
      administrativeAreaClosure: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { descendantId: 'area-1' },
            { descendantId: 'area-2' },
            { descendantId: 'area-3' },
          ]),
      },
    };

    const result = await resolveDescendantAreaIds(prisma, 'area-1');
    expect(result).toEqual(['area-1', 'area-2', 'area-3']);
    expect(prisma.administrativeAreaClosure.findMany).toHaveBeenCalledWith({
      where: { ancestorId: { in: ['area-1'] } },
      select: { descendantId: true },
    });
  });

  it('handles array of area IDs', async () => {
    const prisma = {
      administrativeAreaClosure: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { descendantId: 'child-1' },
            { descendantId: 'child-2' },
          ]),
      },
    };

    const result = await resolveDescendantAreaIds(prisma, ['root-1', 'root-2']);
    expect(result).toEqual(['root-1', 'root-2', 'child-1', 'child-2']);
  });

  it('gracefully falls back to raw IDs if administrativeAreaClosure is missing or throws', async () => {
    const emptyPrisma = {};
    expect(await resolveDescendantAreaIds(emptyPrisma, 'fallback-id')).toEqual([
      'fallback-id',
    ]);

    const errorPrisma = {
      administrativeAreaClosure: {
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
      },
    };
    expect(await resolveDescendantAreaIds(errorPrisma, 'fallback-id')).toEqual([
      'fallback-id',
    ]);
  });
});

describe('resolveAncestorAreaIds', () => {
  it('resolves ancestors and includes original IDs', async () => {
    const prisma = {
      administrativeAreaClosure: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { ancestorId: 'parent-1' },
            { ancestorId: 'grandparent-1' },
          ]),
      },
    };

    const result = await resolveAncestorAreaIds(prisma, 'child-1');
    expect(result).toEqual(['child-1', 'parent-1', 'grandparent-1']);
    expect(prisma.administrativeAreaClosure.findMany).toHaveBeenCalledWith({
      where: { descendantId: { in: ['child-1'] } },
      select: { ancestorId: true },
    });
  });
});

describe('resolveHierarchicalAreaIds', () => {
  it('resolves both ancestors and descendants', async () => {
    const prisma = {
      administrativeAreaClosure: {
        findMany: jest.fn().mockResolvedValue([
          { ancestorId: 'parent-1', descendantId: 'middle-1' },
          { ancestorId: 'middle-1', descendantId: 'child-1' },
        ]),
      },
    };

    const result = await resolveHierarchicalAreaIds(prisma, 'middle-1');
    expect(result).toContain('middle-1');
    expect(result).toContain('parent-1');
    expect(result).toContain('child-1');
  });
});
