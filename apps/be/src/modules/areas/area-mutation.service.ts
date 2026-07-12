import { Injectable } from '@nestjs/common';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import {
  AdministrativeLevel,
  BoundaryQualityStatus,
  Prisma,
} from '../../generated/prisma/client.js';
import { AsyncJobService } from '../runtime/async-job.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PARENT_LEVELS } from './area.constants.js';
import type {
  CreateAreaDto,
  CreateAreaImportDto,
  CreateBoundaryDto,
  UpdateAreaDto,
} from './dto/area.dto.js';

@Injectable()
export class AreaMutationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: AsyncJobService,
  ) {}

  async create(input: CreateAreaDto, actor: AuthorizationContext) {
    await this.validateParent(input.level, input.parentId ?? null);
    return this.prisma.$transaction(async (tx) => {
      const area = await tx.administrativeArea.create({ data: input });
      await tx.administrativeAreaClosure.create({
        data: { ancestorId: area.id, descendantId: area.id, depth: 0 },
      });
      if (area.parentId) {
        const links = await tx.administrativeAreaClosure.findMany({
          where: { descendantId: area.parentId },
        });
        await tx.administrativeAreaClosure.createMany({
          data: links.map((link) => ({
            ancestorId: link.ancestorId,
            descendantId: area.id,
            depth: link.depth + 1,
          })),
          skipDuplicates: true,
        });
      }
      await this.audit(tx, actor, 'AREA.CREATE', area.id, null, area);
      return area;
    });
  }

  async update(id: string, input: UpdateAreaDto, actor: AuthorizationContext) {
    const before = await this.prisma.administrativeArea.findUniqueOrThrow({
      where: { id },
    });
    const updated = await this.prisma.administrativeArea.update({
      where: { id },
      data: input,
    });
    await this.audit(this.prisma, actor, 'AREA.UPDATE', id, before, updated);
    return updated;
  }

  async move(
    id: string,
    parentId: string,
    reason: string,
    actor: AuthorizationContext,
  ) {
    const area = await this.prisma.administrativeArea.findUniqueOrThrow({
      where: { id },
    });
    await this.validateParent(area.level, parentId);
    const cycle = await this.prisma.administrativeAreaClosure.findUnique({
      where: {
        ancestorId_descendantId: { ancestorId: id, descendantId: parentId },
      },
    });
    if (cycle) {
      throw new ApiException(
        'AREA_HIERARCHY_CYCLE',
        'Selected parent is inside the area subtree.',
        422,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.administrativeArea.update({ where: { id }, data: { parentId } });
      await tx.administrativeAreaClosure.deleteMany();
      await tx.$executeRaw(
        Prisma.sql`WITH RECURSIVE paths AS (SELECT "id" ancestor_id,"id" descendant_id,0 depth FROM "AdministrativeArea" UNION ALL SELECT paths.ancestor_id,child."id",paths.depth+1 FROM paths JOIN "AdministrativeArea" child ON child."parentId"=paths.descendant_id) INSERT INTO "AdministrativeAreaClosure"("ancestorId","descendantId","depth") SELECT ancestor_id,descendant_id,depth FROM paths`,
      );
      await this.audit(
        tx,
        actor,
        'AREA.MOVE',
        id,
        { parentId: area.parentId },
        { parentId, reason },
      );
    });
  }

  async createBoundary(
    areaId: string,
    input: CreateBoundaryDto,
    actor: AuthorizationContext,
  ) {
    const [{ nextVersion }] = await this.prisma.$queryRaw<
      Array<{ nextVersion: number }>
    >(
      Prisma.sql`SELECT COALESCE(MAX("versionNumber"),0)+1 AS "nextVersion" FROM "AdministrativeAreaBoundary" WHERE "areaId"=${areaId}`,
    );
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`INSERT INTO "AdministrativeAreaBoundary"("id","areaId","dataSourceId","versionNumber","boundary","qualityStatus","effectiveFrom","isActive","createdAt","updatedAt") VALUES(gen_random_uuid(),${areaId}::uuid,${input.dataSourceId ?? null}::uuid,${nextVersion},ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(input.geoJson)}),4326)),${input.qualityStatus}::"BoundaryQualityStatus",${new Date(input.effectiveFrom)},false,now(),now()) RETURNING "id"`,
    );
    await this.audit(
      this.prisma,
      actor,
      'AREA.BOUNDARY.CREATE',
      rows[0].id,
      null,
      { areaId, versionNumber: nextVersion },
    );
    return this.prisma.administrativeAreaBoundary.findUniqueOrThrow({
      where: { id: rows[0].id },
    });
  }

  async activateBoundary(
    id: string,
    effectiveFrom: Date,
    reason: string,
    actor: AuthorizationContext,
  ) {
    const boundary =
      await this.prisma.administrativeAreaBoundary.findUniqueOrThrow({
        where: { id },
      });
    await this.prisma.$transaction(async (tx) => {
      await tx.administrativeAreaBoundary.updateMany({
        where: {
          areaId: boundary.areaId,
          isActive: true,
          effectiveUntil: null,
        },
        data: { isActive: false, effectiveUntil: effectiveFrom },
      });
      await tx.administrativeAreaBoundary.update({
        where: { id },
        data: { isActive: true, effectiveFrom, effectiveUntil: null },
      });
      await this.audit(tx, actor, 'AREA.BOUNDARY.ACTIVATE', id, null, {
        reason,
      });
    });
    return this.prisma.administrativeAreaBoundary.findUniqueOrThrow({
      where: { id },
    });
  }

  async invalidateBoundary(
    id: string,
    reason: string,
    actor: AuthorizationContext,
  ) {
    const updated = await this.prisma.administrativeAreaBoundary.update({
      where: { id },
      data: {
        qualityStatus: BoundaryQualityStatus.INVALID,
        isActive: false,
        effectiveUntil: new Date(),
      },
    });
    await this.audit(this.prisma, actor, 'AREA.BOUNDARY.INVALIDATE', id, null, {
      reason,
    });
    return updated;
  }

  createImport(input: CreateAreaImportDto, actor: AuthorizationContext) {
    return this.jobs.enqueue({
      type: 'ADMINISTRATIVE_AREA_IMPORT',
      payload: input as unknown as Prisma.InputJsonValue,
      requestedById: actor.primaryAssignmentId,
      correlationId: input.fileId,
    });
  }

  private async validateParent(
    level: AdministrativeLevel,
    parentId: string | null,
  ) {
    if (level === AdministrativeLevel.COUNTRY) {
      if (parentId) {
        throw new ApiException(
          'INVALID_AREA_HIERARCHY',
          'COUNTRY cannot have a parent.',
          422,
        );
      }
      return;
    }
    if (!parentId) {
      throw new ApiException(
        'INVALID_AREA_HIERARCHY',
        `${level} requires a parent.`,
        422,
      );
    }
    const parent = await this.prisma.administrativeArea.findUnique({
      where: { id: parentId },
    });
    if (!parent || !PARENT_LEVELS[level]?.includes(parent.level)) {
      throw new ApiException(
        'INVALID_AREA_HIERARCHY',
        `Invalid parent level for ${level}.`,
        422,
      );
    }
  }

  private audit(
    client: Prisma.TransactionClient | PrismaService,
    actor: AuthorizationContext,
    action: string,
    id: string,
    before: unknown,
    after: unknown,
  ) {
    return client.auditLog.create({
      data: {
        actorUserProfileId: actor.userProfileId,
        actorAssignmentId: actor.primaryAssignmentId,
        action,
        entityType: 'AdministrativeArea',
        entityId: id,
        beforeData: before as Prisma.InputJsonValue,
        afterData: after as Prisma.InputJsonValue,
      },
    });
  }
}
