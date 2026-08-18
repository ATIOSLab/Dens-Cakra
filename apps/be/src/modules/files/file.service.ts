import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import {
  FileLifecycleStatus,
  FileType,
} from '../../generated/prisma/client.js';
import { env } from '../../lib/env.js';
import { LocalStorageService } from '../infrastructure/local-storage.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JobHandlerRegistry } from '../runtime/job-handler.registry.js';
import type { CompleteFileDto, PresignFileDto } from './dto/file.dto.js';

const execFileAsync = promisify(execFile);
const PREVIEWABLE_PENDING_PHOTO_STATUSES = new Set<FileLifecycleStatus>([
  FileLifecycleStatus.UPLOADED,
  FileLifecycleStatus.SCANNING,
]);

@Injectable()
export class FileService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageService,
    private readonly handlers: JobHandlerRegistry,
  ) {}
  onModuleInit() {
    this.handlers.register('FILE_SCAN', (payload) =>
      this.scanFile((payload as { fileId: string }).fileId),
    );
  }
  async presign(input: PresignFileDto, actor: AuthorizationContext) {
    if (input.sizeBytes > env.storage.maxFileSizeBytes)
      throw new ApiException(
        'FILE_TOO_LARGE',
        'File exceeds configured maximum size.',
        422,
      );
    const storageKey = this.storage.createStorageKey(
      input.context,
      input.originalName,
    );
    const uploadToken = this.storage.createToken({
      purpose: 'upload',
      storageKey,
      expiresAt: Date.now() + 15 * 60_000,
    });
    await this.prisma.fileUploadReservation.create({
      data: {
        storageKey,
        originalName: input.originalName,
        mimeType: input.mimeType,
        fileType: input.fileType,
        sizeBytes: BigInt(input.sizeBytes),
        checksumSha256: input.checksumSha256.toLowerCase(),
        context: input.context,
        uploadTokenHash: createHash('sha256').update(uploadToken).digest('hex'),
        createdByAssignmentId: actor.primaryAssignmentId,
        expiresAt: new Date(Date.now() + 15 * 60_000),
      },
    });
    return {
      uploadToken,
      storageKey,
      uploadUrl: `/api/storage/uploads/${uploadToken}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      expiresAt: new Date(Date.now() + 15 * 60_000),
    };
  }
  async complete(input: CompleteFileDto, actor: AuthorizationContext) {
    const tokenHash = createHash('sha256')
      .update(input.uploadToken)
      .digest('hex');
    const reservation = await this.prisma.fileUploadReservation.findUnique({
      where: { uploadTokenHash: tokenHash },
    });
    if (
      !reservation ||
      reservation.storageKey !== input.storageKey ||
      reservation.expiresAt <= new Date() ||
      reservation.completedAt
    )
      throw new ApiException(
        'UPLOAD_RESERVATION_INVALID',
        'Upload reservation is invalid, expired, or already completed.',
        422,
      );
    if (reservation.createdByAssignmentId !== actor.primaryAssignmentId)
      throw new ApiException(
        'RESOURCE_NOT_FOUND',
        'Upload reservation was not found.',
        404,
      );
    const actual = await this.storage.inspect(reservation.storageKey);
    if (
      actual.sizeBytes !== reservation.sizeBytes ||
      actual.checksumSha256 !== reservation.checksumSha256
    )
      throw new ApiException(
        'FILE_INTEGRITY_FAILED',
        'Uploaded file size or checksum does not match reservation.',
        422,
      );
    await this.assertDeclaredImageContent(
      reservation.storageKey,
      reservation.mimeType,
    );
    const file = await this.prisma.$transaction(async (tx) => {
      const created = await tx.fileAsset.create({
        data: {
          storageKey: reservation.storageKey,
          originalName: reservation.originalName,
          mimeType: reservation.mimeType,
          fileType: reservation.fileType,
          sizeBytes: reservation.sizeBytes,
          checksumSha256: reservation.checksumSha256,
          lifecycleStatus: FileLifecycleStatus.UPLOADED,
          createdByAssignmentId: actor.primaryAssignmentId,
        },
      });
      await tx.fileUploadReservation.update({
        where: { id: reservation.id },
        data: { fileAssetId: created.id, completedAt: new Date() },
      });
      await tx.asyncJob.create({
        data: {
          type: 'FILE_SCAN',
          payload: { fileId: created.id },
          requestedById: actor.primaryAssignmentId,
          correlationId: created.id,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserProfileId: actor.userProfileId,
          actorAssignmentId: actor.primaryAssignmentId,
          action: 'FILE.UPLOAD.COMPLETE',
          entityType: 'FileAsset',
          entityId: created.id,
          afterData: {
            mimeType: created.mimeType,
            sizeBytes: created.sizeBytes.toString(),
            checksumSha256: created.checksumSha256,
          },
        },
      });
      return created;
    });
    return file;
  }
  metadata(id: string) {
    return this.prisma.fileAsset.findFirstOrThrow({
      where: { id, deletedAt: null },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        fileType: true,
        sizeBytes: true,
        checksumSha256: true,
        lifecycleStatus: true,
        scanResult: true,
        scannedAt: true,
        quarantineReason: true,
        retentionUntil: true,
        createdAt: true,
      },
    });
  }
  async accessUrl(
    id: string,
    ttlSeconds: number,
    disposition: string,
    actor: AuthorizationContext,
  ) {
    const file = await this.prisma.fileAsset.findFirst({
      where: { id, deletedAt: null },
    });
    if (!file)
      throw new ApiException('RESOURCE_NOT_FOUND', 'File was not found.', 404);

    const isPreviewablePendingPhoto =
      file.fileType === FileType.PHOTO &&
      file.mimeType.startsWith('image/') &&
      PREVIEWABLE_PENDING_PHOTO_STATUSES.has(file.lifecycleStatus);
    const isFalseScannerQuarantinePhoto =
      file.fileType === FileType.PHOTO &&
      file.mimeType.startsWith('image/') &&
      file.lifecycleStatus === FileLifecycleStatus.QUARANTINED &&
      isScannerUnavailable(file.quarantineReason ?? file.scanResult);

    if (
      file.lifecycleStatus !== FileLifecycleStatus.CLEAN &&
      !isPreviewablePendingPhoto &&
      !isFalseScannerQuarantinePhoto
    )
      throw new ApiException(
        'FILE_NOT_USABLE',
        'File has not passed malware scanning.',
        409,
      );
    const token = this.storage.createToken({
      purpose: 'download',
      storageKey: file.storageKey,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    await this.prisma.auditLog.create({
      data: {
        actorUserProfileId: actor.userProfileId,
        actorAssignmentId: actor.primaryAssignmentId,
        action: 'FILE.ACCESS_URL.CREATE',
        entityType: 'FileAsset',
        entityId: id,
        metadata: { disposition, ttlSeconds },
      },
    });
    return {
      url: `/api/storage/files/${token}`,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      disposition,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes.toString(),
      checksumSha256: file.checksumSha256,
    };
  }
  async remove(id: string, actor: AuthorizationContext) {
    const file = await this.prisma.fileAsset.findFirstOrThrow({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            whatsAppMedia: true,
            taskAttachments: true,
            baketAttachments: true,
            productAttachments: true,
            emergencyAttachments: true,
          },
        },
      },
    });
    if (Object.values(file._count).some((count) => count > 0))
      throw new ApiException(
        'FILE_IN_USE',
        'File is referenced by operational data.',
        409,
      );
    await this.prisma.fileAsset.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        lifecycleStatus: FileLifecycleStatus.DELETED,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        actorUserProfileId: actor.userProfileId,
        actorAssignmentId: actor.primaryAssignmentId,
        action: 'FILE.DELETE',
        entityType: 'FileAsset',
        entityId: id,
      },
    });
  }
  private async assertDeclaredImageContent(
    storageKey: string,
    mimeType: string,
  ): Promise<void> {
    if (!mimeType.startsWith('image/')) {
      return;
    }

    const prefix = await readFilePrefix(this.storage, storageKey);

    if (looksLikeMarkup(prefix)) {
      throw new ApiException(
        'FILE_TYPE_MISMATCH',
        'Uploaded content does not match the declared image type.',
        422,
      );
    }
  }

  async scanFile(fileId: string) {
    const file = await this.prisma.fileAsset.update({
      where: { id: fileId },
      data: { lifecycleStatus: FileLifecycleStatus.SCANNING },
    });
    try {
      const token = this.storage.createToken({
        purpose: 'download',
        storageKey: file.storageKey,
        expiresAt: Date.now() + 60_000,
      });
      const payload = this.storage.verifyToken(token, 'download');
      const stream = this.storage.openReadStream(payload.storageKey);
      stream.destroy();
      await execFileAsync('clamscan', [
        '--no-summary',
        pathForScan(env.storage.root, file.storageKey),
      ]);
      await this.prisma.fileAsset.update({
        where: { id: fileId },
        data: {
          lifecycleStatus: FileLifecycleStatus.CLEAN,
          scannedAt: new Date(),
          scanResult: { scanner: 'clamav', clean: true },
        },
      });
      return { clean: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (isScannerUnavailable(error)) {
        const lifecycleStatus = env.storage.scanRequired
          ? FileLifecycleStatus.QUARANTINED
          : FileLifecycleStatus.CLEAN;

        await this.prisma.fileAsset.update({
          where: { id: fileId },
          data: {
            lifecycleStatus,
            scannedAt: new Date(),
            ...(env.storage.scanRequired
              ? { quarantineReason: 'clamscan_unavailable' }
              : {}),
            scanResult: {
              scanner: 'clamav',
              clean: !env.storage.scanRequired,
              skipped: true,
              reason: 'clamscan_unavailable',
            },
          },
        });
        return env.storage.scanRequired
          ? { clean: false, quarantined: true, skipped: true }
          : { clean: true, skipped: true };
      }

      await this.prisma.fileAsset.update({
        where: { id: fileId },
        data: {
          lifecycleStatus: FileLifecycleStatus.QUARANTINED,
          scannedAt: new Date(),
          quarantineReason: message,
          scanResult: { scanner: 'clamav', clean: false, error: message },
        },
      });
      return { clean: false, quarantined: true };
    }
  }
}
function pathForScan(root: string, storageKey: string) {
  return `${root.replace(/[\\/]$/, '')}/${storageKey.replace(/\\/g, '/')}`;
}

const MAGIC_BYTES_PREFIX_LENGTH = 512;

async function readFilePrefix(
  storage: LocalStorageService,
  storageKey: string,
): Promise<Buffer> {
  const stream = storage.openReadStream(storageKey);
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    chunks.push(buffer);
    total += buffer.length;
    if (total >= MAGIC_BYTES_PREFIX_LENGTH) break;
  }

  stream.destroy();
  return Buffer.concat(chunks).subarray(0, MAGIC_BYTES_PREFIX_LENGTH);
}

function looksLikeMarkup(prefix: Buffer): boolean {
  const text = prefix.toString('latin1').trimStart();
  return /^(<\?xml|<(?:!doctype|html|head|body|script|svg|iframe|img)\b)/i.test(
    text,
  );
}

function isScannerUnavailable(error: unknown): boolean {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : JSON.stringify(error ?? '');
  const normalized = message.toLowerCase();

  return (
    code === 'ENOENT' ||
    normalized.includes('clamscan_unavailable') ||
    (normalized.includes('clamscan') && normalized.includes('enoent'))
  );
}
