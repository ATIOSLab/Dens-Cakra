export type PrismaClosureClient = {
  administrativeAreaClosure?: {
    findMany: (
      args: any,
    ) => Promise<Array<{ ancestorId?: string; descendantId?: string }>>;
  };
};

/**
 * Pre-resolves an area ID or list of area IDs to include all their hierarchical descendant area IDs
 * using the pre-computed AdministrativeAreaClosure index table.
 *
 * This turns slow correlated subqueries like:
 * `area: { OR: [{ id: areaId }, { descendantLinks: { some: { ancestorId: areaId } } }] }`
 * into fast, index-seekable array lookups:
 * `areaId: { in: resolvedAreaIds }`
 */
export async function resolveDescendantAreaIds(
  prisma: PrismaClosureClient,
  areaIds: string | string[] | null | undefined,
): Promise<string[]> {
  if (!areaIds) return [];
  const rawIds = (Array.isArray(areaIds) ? areaIds : [areaIds]).filter(Boolean);
  if (rawIds.length === 0) return [];
  if (!prisma?.administrativeAreaClosure) return rawIds;

  try {
    const closures = await prisma.administrativeAreaClosure.findMany({
      where: { ancestorId: { in: rawIds } },
      select: { descendantId: true },
    });
    return Array.from(
      new Set([
        ...rawIds,
        ...closures.map((c) => c.descendantId!).filter(Boolean),
      ]),
    );
  } catch {
    return rawIds;
  }
}

/**
 * Pre-resolves an area ID or list of area IDs to include all their hierarchical ancestor area IDs
 * using the pre-computed AdministrativeAreaClosure index table.
 */
export async function resolveAncestorAreaIds(
  prisma: PrismaClosureClient,
  areaIds: string | string[] | null | undefined,
): Promise<string[]> {
  if (!areaIds) return [];
  const rawIds = (Array.isArray(areaIds) ? areaIds : [areaIds]).filter(Boolean);
  if (rawIds.length === 0) return [];
  if (!prisma?.administrativeAreaClosure) return rawIds;

  try {
    const closures = await prisma.administrativeAreaClosure.findMany({
      where: { descendantId: { in: rawIds } },
      select: { ancestorId: true },
    });
    return Array.from(
      new Set([
        ...rawIds,
        ...closures.map((c) => c.ancestorId!).filter(Boolean),
      ]),
    );
  } catch {
    return rawIds;
  }
}

/**
 * Pre-resolves an area ID or list of area IDs to include both all their ancestors and descendants
 * (complete hierarchical tree overlap) using the pre-computed AdministrativeAreaClosure table.
 */
export async function resolveHierarchicalAreaIds(
  prisma: PrismaClosureClient,
  areaIds: string | string[] | null | undefined,
): Promise<string[]> {
  if (!areaIds) return [];
  const rawIds = (Array.isArray(areaIds) ? areaIds : [areaIds]).filter(Boolean);
  if (rawIds.length === 0) return [];
  if (!prisma?.administrativeAreaClosure) return rawIds;

  try {
    const closures = await prisma.administrativeAreaClosure.findMany({
      where: {
        OR: [{ ancestorId: { in: rawIds } }, { descendantId: { in: rawIds } }],
      },
      select: { ancestorId: true, descendantId: true },
    });
    const result = new Set<string>(rawIds);
    for (const c of closures) {
      if (c.ancestorId) result.add(c.ancestorId);
      if (c.descendantId) result.add(c.descendantId);
    }
    return Array.from(result);
  } catch {
    return rawIds;
  }
}
