import { Injectable } from '@nestjs/common';
import {
  DirectiveStatus,
  Prisma,
  TaskStatus,
  UukStrSectionType,
  UukStrStatus,
} from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CancelDto,
  CreateUukDto,
  CreateUukRevisionDto,
  PublishDto,
  ReplaceSectionsDto,
  SectionDto,
  UukQuery,
  UpdateUukVersionDto,
} from './uuk.dto.js';

const REQUIRED_UUK_SECTION_TYPES = new Set<UukStrSectionType>([
  UukStrSectionType.BASIS_BACKGROUND,
  UukStrSectionType.INVESTIGATION_TARGETS,
  UukStrSectionType.EEI_PIR,
  UukStrSectionType.COLLECTION_PLAN,
  UukStrSectionType.THREAT_RISK_ANALYSIS,
  UukStrSectionType.IMPLEMENTATION_MECHANISM,
  UukStrSectionType.COORDINATION_REPORTING,
  UukStrSectionType.RECOMMENDATION,
  UukStrSectionType.AUTHENTICATION,
]);

@Injectable()
export class UukService {
  constructor(private readonly prisma: PrismaService) {}

  private validateSections(sections: SectionDto[]) {
    const sectionTypeSet = new Set<string>();
    const sectionOrderSet = new Set<number>();

    for (const section of sections) {
      if (sectionTypeSet.has(section.sectionType)) {
        throw new ApiException(
          'UUK_SECTION_TYPE_DUPLICATE',
          'Section type must be unique in a version.',
          409,
        );
      }
      if (sectionOrderSet.has(section.orderNumber)) {
        throw new ApiException(
          'UUK_SECTION_ORDER_DUPLICATE',
          'Section order number must be unique in a version.',
          409,
        );
      }

      sectionTypeSet.add(section.sectionType);
      sectionOrderSet.add(section.orderNumber);

      const itemCodeSet = new Set<string>();
      const itemOrderSet = new Set<number>();
      for (const item of section.items) {
        if (
          itemCodeSet.has(item.itemCode) ||
          itemOrderSet.has(item.orderNumber)
        ) {
          throw new ApiException(
            'UUK_SECTION_ITEM_DUPLICATE',
            'Section item code and order must be unique.',
            409,
          );
        }
        itemCodeSet.add(item.itemCode);
        itemOrderSet.add(item.orderNumber);
      }
    }
  }

  private isComplete(sections: SectionDto[]) {
    const typeSet = new Set(sections.map((section) => section.sectionType));
    for (const required of REQUIRED_UUK_SECTION_TYPES) {
      if (!typeSet.has(required)) {
        return false;
      }
    }
    return true;
  }

  private async audit(
    context: AuthorizationContext,
    action: string,
    entityId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorUserProfileId: context.userProfileId,
        actorAssignmentId: context.primaryAssignmentId,
        action,
        entityType: 'UukStr',
        entityId,
        ...(metadata ? { metadata } : {}),
      },
    });
  }

  private detail(id: string) {
    return this.prisma.uukStr.findFirstOrThrow({
      where: { id, deletedAt: null },
      include: {
        ownerUnit: true,
        directiveVersion: {
          include: {
            directive: true,
            targetAreas: { include: { area: true } },
          },
        },
        createdByAssignment: {
          include: { userProfile: true, position: true },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            createdByAssignment: {
              include: { userProfile: true, position: true },
            },
            sections: {
              orderBy: { orderNumber: 'asc' },
              include: {
                items: { orderBy: { orderNumber: 'asc' } },
              },
            },
            tasks: {
              include: {
                assignments: true,
                targetAreas: { include: { area: true } },
              },
            },
          },
        },
      },
    });
  }

  private versionDetail(versionId: string) {
    return this.prisma.uukStrVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: {
        uukStr: {
          include: {
            ownerUnit: true,
            directiveVersion: {
              include: {
                directive: true,
              },
            },
          },
        },
        createdByAssignment: {
          include: { userProfile: true, position: true },
        },
        sections: {
          orderBy: { orderNumber: 'asc' },
          include: {
            items: { orderBy: { orderNumber: 'asc' } },
          },
        },
        tasks: {
          include: {
            assignments: true,
            targetAreas: { include: { area: true } },
          },
        },
      },
    });
  }

  private async getEditableVersion(versionId: string) {
    const version = await this.prisma.uukStrVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: { uukStr: true },
    });

    if (
      version.uukStr.status === UukStrStatus.PUBLISHED ||
      version.uukStr.status === UukStrStatus.CANCELLED ||
      version.versionNumber !== version.uukStr.currentVersionNumber
    ) {
      throw new ApiException(
        'UUK_VERSION_IMMUTABLE',
        'Only the current unpublished UUK/STR version can be changed.',
        409,
      );
    }

    return version;
  }

  private async replaceSectionsInternal(
    tx: Prisma.TransactionClient,
    versionId: string,
    sections: SectionDto[],
  ) {
    this.validateSections(sections);

    await tx.uukStrSection.deleteMany({
      where: { uukStrVersionId: versionId },
    });

    for (const section of sections) {
      await tx.uukStrSection.create({
        data: {
          uukStrVersionId: versionId,
          sectionType: section.sectionType,
          title: section.title,
          orderNumber: section.orderNumber,
          items: {
            create: section.items.map((item) => ({
              itemCode: item.itemCode,
              content: item.content,
              orderNumber: item.orderNumber,
            })),
          },
        },
      });
    }
  }

  async list(query: UukQuery) {
    return this.prisma.uukStr.findMany({
      where: {
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
        ...(query.ownerUnitId ? { ownerUnitId: query.ownerUnitId } : {}),
        ...(query.directiveId
          ? {
              directiveVersion: {
                directiveId: query.directiveId,
              },
            }
          : {}),
        ...(query.search
          ? {
              OR: [
                {
                  versions: {
                    some: {
                      title: { contains: query.search, mode: 'insensitive' },
                    },
                  },
                },
                {
                  directiveVersion: {
                    directive: {
                      commandNumber: {
                        contains: query.search,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      take: query.limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        ownerUnit: true,
        directiveVersion: {
          include: { directive: true },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: {
            sections: {
              orderBy: { orderNumber: 'asc' },
              include: { items: true },
            },
          },
        },
      },
    });
  }

  async create(body: CreateUukDto, context: AuthorizationContext) {
    this.validateSections(body.sections);
    const directiveVersion =
      await this.prisma.directiveVersion.findUniqueOrThrow({
        where: { id: body.directiveVersionId },
        include: { directive: true },
      });
    if (
      directiveVersion.directive.status === DirectiveStatus.CANCELLED ||
      directiveVersion.directive.status === DirectiveStatus.COMPLETED
    ) {
      throw new ApiException(
        'UUK_DIRECTIVE_NOT_MUTABLE',
        'Cannot create UUK/STR under cancelled or completed directive.',
        409,
      );
    }

    const uuk = await this.prisma.$transaction(async (tx) => {
      const root = await tx.uukStr.create({
        data: {
          directiveVersionId: body.directiveVersionId,
          ownerUnitId: body.ownerUnitId,
          createdByAssignmentId: context.primaryAssignmentId,
          status: this.isComplete(body.sections)
            ? UukStrStatus.READY
            : UukStrStatus.DRAFT,
        },
      });
      const version = await tx.uukStrVersion.create({
        data: {
          uukStrId: root.id,
          versionNumber: 1,
          title: body.title,
          createdByAssignmentId: context.primaryAssignmentId,
        },
      });
      await this.replaceSectionsInternal(tx, version.id, body.sections);
      return root;
    });

    await this.audit(context, 'UUK.CREATE', uuk.id);
    return this.detail(uuk.id);
  }

  async get(uukStrId: string) {
    return this.detail(uukStrId);
  }

  async versions(uukStrId: string) {
    return this.prisma.uukStrVersion.findMany({
      where: { uukStrId },
      orderBy: { versionNumber: 'desc' },
      include: {
        createdByAssignment: {
          include: { userProfile: true, position: true },
        },
        sections: {
          orderBy: { orderNumber: 'asc' },
          include: {
            items: { orderBy: { orderNumber: 'asc' } },
          },
        },
      },
    });
  }

  async createVersion(
    uukStrId: string,
    body: CreateUukRevisionDto,
    context: AuthorizationContext,
  ) {
    this.validateSections(body.sections);
    const uuk = await this.prisma.uukStr.findUniqueOrThrow({
      where: { id: uukStrId },
    });
    if (uuk.status === UukStrStatus.CANCELLED) {
      throw new ApiException(
        'UUK_NOT_MUTABLE',
        'Cancelled UUK/STR cannot be revised.',
        409,
      );
    }

    const version = await this.prisma.$transaction(async (tx) => {
      if (body.basedOnVersionId) {
        await tx.uukStrVersion.findUniqueOrThrow({
          where: { id: body.basedOnVersionId },
        });
      }

      const nextVersionNumber = uuk.currentVersionNumber + 1;
      const created = await tx.uukStrVersion.create({
        data: {
          uukStrId,
          versionNumber: nextVersionNumber,
          title: body.title,
          createdByAssignmentId: context.primaryAssignmentId,
          changeReason: body.changeReason,
        },
      });
      await this.replaceSectionsInternal(tx, created.id, body.sections);
      await tx.uukStr.update({
        where: { id: uukStrId },
        data: {
          currentVersionNumber: nextVersionNumber,
          status: this.isComplete(body.sections)
            ? UukStrStatus.READY
            : UukStrStatus.REVISED,
        },
      });
      return created;
    });

    await this.audit(context, 'UUK.VERSION.CREATE', uukStrId, {
      versionId: version.id,
      versionNumber: version.versionNumber,
    });
    return this.versionDetail(version.id);
  }

  async getVersion(versionId: string) {
    return this.versionDetail(versionId);
  }

  async updateVersion(
    versionId: string,
    body: UpdateUukVersionDto,
    context: AuthorizationContext,
  ) {
    await this.getEditableVersion(versionId);
    await this.prisma.uukStrVersion.update({
      where: { id: versionId },
      data: {
        title: body.title,
        ...(body.changeReason ? { changeReason: body.changeReason } : {}),
      },
    });
    await this.audit(context, 'UUK.VERSION.UPDATE', versionId);
    return this.versionDetail(versionId);
  }

  async replaceSections(
    versionId: string,
    body: ReplaceSectionsDto,
    context: AuthorizationContext,
  ) {
    const version = await this.getEditableVersion(versionId);
    await this.prisma.$transaction(async (tx) => {
      await this.replaceSectionsInternal(tx, versionId, body.sections);
      await tx.uukStr.update({
        where: { id: version.uukStrId },
        data: {
          status: this.isComplete(body.sections)
            ? UukStrStatus.READY
            : UukStrStatus.DRAFT,
        },
      });
    });
    await this.audit(context, 'UUK.SECTIONS.REPLACE', versionId);
    return this.versionDetail(versionId);
  }

  async publish(
    versionId: string,
    body: PublishDto,
    context: AuthorizationContext,
  ) {
    if (body.confirmation !== 'PUBLISH') {
      throw new ApiException(
        'UUK_PUBLISH_CONFIRMATION_REQUIRED',
        'Confirmation must be PUBLISH.',
        422,
      );
    }

    const version = await this.getEditableVersion(versionId);
    const fullVersion = await this.versionDetail(versionId);
    if (
      fullVersion.sections.length < REQUIRED_UUK_SECTION_TYPES.size ||
      !this.isComplete(
        fullVersion.sections.map((section) => ({
          sectionType: section.sectionType,
          title: section.title,
          orderNumber: section.orderNumber,
          items: section.items.map((item) => ({
            itemCode: item.itemCode,
            content: item.content,
            orderNumber: item.orderNumber,
          })),
        })),
      )
    ) {
      throw new ApiException(
        'UUK_INCOMPLETE',
        'All required UUK/STR section types must be completed before publish.',
        422,
      );
    }

    await this.prisma.uukStr.update({
      where: { id: version.uukStrId },
      data: { status: UukStrStatus.PUBLISHED },
    });
    await this.audit(context, 'UUK.PUBLISH', version.uukStrId, { versionId });
    return this.detail(version.uukStrId);
  }

  async cancel(
    uukStrId: string,
    body: CancelDto,
    context: AuthorizationContext,
  ) {
    const uuk = await this.detail(uukStrId);
    if (uuk.status === UukStrStatus.CANCELLED) {
      return uuk;
    }

    const linkedTasks = uuk.versions.flatMap((version) => version.tasks);
    if (
      linkedTasks.length > 0 &&
      linkedTasks.every((task) => task.status === TaskStatus.COMPLETED)
    ) {
      throw new ApiException(
        'UUK_CANCEL_BLOCKED',
        'UUK/STR with fully completed linked tasks cannot be cancelled.',
        409,
      );
    }

    await this.prisma.uukStr.update({
      where: { id: uukStrId },
      data: { status: UukStrStatus.CANCELLED },
    });
    await this.audit(context, 'UUK.CANCEL', uukStrId, { reason: body.reason });
    return this.detail(uukStrId);
  }
}
