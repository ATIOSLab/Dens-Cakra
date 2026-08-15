import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { apiResult } from '../../common/api/api-response.js';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { CurrentAccessContext } from '../../common/decorators/current-access-context.decorator.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import {
  CompleteFileDto,
  FileAccessQueryDto,
  PresignFileDto,
} from './dto/file.dto.js';
import { FileService } from './file.service.js';
@ApiTags('07. File Assets')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller('files')
export class FileController {
  constructor(private readonly files: FileService) {}
  @Post('presign')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiContract({
    operationId: 'apiFile001',
    contractId: 'API-FILE-001',
    summary: 'Minta signed upload URL',
    roles: [
      'admin_system',
      'operational_intelligence_manager',
      'field_coordinator',
      'field_officer',
    ],
    successStatus: 201,
    idempotent: true,
  })
  async presign(
    @Body() b: PresignFileDto,
    @CurrentAccessContext() a: AuthorizationContext,
  ) {
    return apiResult(await this.files.presign(b, a));
  }
  @Post('complete')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiContract({
    operationId: 'apiFile002',
    contractId: 'API-FILE-002',
    summary: 'Konfirmasi upload selesai',
    roles: [
      'admin_system',
      'operational_intelligence_manager',
      'field_coordinator',
      'field_officer',
    ],
    successStatus: 201,
    idempotent: true,
  })
  async complete(
    @Body() b: CompleteFileDto,
    @CurrentAccessContext() a: AuthorizationContext,
  ) {
    return apiResult(await this.files.complete(b, a));
  }
  @Get(':fileId')
  @ApiContract({
    operationId: 'apiFile003',
    contractId: 'API-FILE-003',
    summary: 'Metadata file',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
      'field_officer',
    ],
  })
  async metadata(@Param('fileId', ParseUUIDPipe) id: string) {
    return apiResult(await this.files.metadata(id));
  }
  @Get(':fileId/access-url')
  @ApiContract({
    operationId: 'apiFile004',
    contractId: 'API-FILE-004',
    summary: 'Signed download/view URL',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
      'field_officer',
    ],
  })
  async access(
    @Param('fileId', ParseUUIDPipe) id: string,
    @Query() q: FileAccessQueryDto,
    @CurrentAccessContext() a: AuthorizationContext,
  ) {
    return apiResult(
      await this.files.accessUrl(id, q.ttlSeconds, q.disposition, a),
    );
  }
  @Delete(':fileId')
  @HttpCode(204)
  @ApiContract({
    operationId: 'apiFile005',
    contractId: 'API-FILE-005',
    summary: 'Soft delete file tidak terpakai',
    roles: ['admin_system'],
    successStatus: 204,
    idempotent: true,
  })
  async remove(
    @Param('fileId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() a: AuthorizationContext,
  ) {
    await this.files.remove(id, a);
  }
}
