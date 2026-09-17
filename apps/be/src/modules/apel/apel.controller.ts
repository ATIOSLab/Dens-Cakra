import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { apiResult } from '../../common/api/api-response.js';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { CurrentAccessContext } from '../../common/decorators/current-access-context.decorator.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import {
  CreateApelConfigDto,
  UpdateApelConfigDto,
  TriggerApelBlastDto,
  ApelSessionQueryDto,
  ApelMapDataQueryDto,
} from './apel.dto.js';
import { ApelService } from './apel.service.js';

@ApiTags('15. Apel & Absensi Jaring')
@Controller('apel')
@UseGuards(SessionGuard, DomainAccessGuard)
export class ApelController {
  constructor(private readonly apelService: ApelService) {}

  @Get('configs')
  @ApiContract({
    operationId: 'apiApel001',
    contractId: 'API-APEL-001',
    summary: 'Daftar Konfigurasi Apel Jaring',
    access: 'authenticated',
    successStatus: 200,
  })
  async listConfigs() {
    return apiResult(await this.apelService.listConfigs());
  }

  @Get('configs/:id')
  @ApiContract({
    operationId: 'apiApel002',
    contractId: 'API-APEL-002',
    summary: 'Detail Konfigurasi Apel Jaring',
    access: 'authenticated',
    successStatus: 200,
  })
  async getConfig(@Param('id', ParseUUIDPipe) id: string) {
    return apiResult(await this.apelService.getConfig(id));
  }

  @Post('configs')
  @ApiContract({
    operationId: 'apiApel003',
    contractId: 'API-APEL-003',
    summary: 'Buat Konfigurasi Apel Jaring Baru',
    access: 'authenticated',
    successStatus: 201,
  })
  async createConfig(@Body() dto: CreateApelConfigDto) {
    return apiResult(await this.apelService.createConfig(dto));
  }

  @Patch('configs/:id')
  @ApiContract({
    operationId: 'apiApel004',
    contractId: 'API-APEL-004',
    summary: 'Perbarui Konfigurasi Apel Jaring',
    access: 'authenticated',
    successStatus: 200,
  })
  async updateConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApelConfigDto,
  ) {
    return apiResult(await this.apelService.updateConfig(id, dto));
  }

  @Delete('configs/:id')
  @ApiContract({
    operationId: 'apiApel005',
    contractId: 'API-APEL-005',
    summary: 'Hapus Konfigurasi Apel Jaring',
    access: 'authenticated',
    successStatus: 200,
  })
  async deleteConfig(@Param('id', ParseUUIDPipe) id: string) {
    return apiResult(await this.apelService.deleteConfig(id));
  }

  @Post('trigger-blast')
  @ApiContract({
    operationId: 'apiApel006',
    contractId: 'API-APEL-006',
    summary: 'Picu Sesi Blasting Apel Seketika',
    access: 'authenticated',
    successStatus: 201,
  })
  async triggerBlast(
    @Body() dto: TriggerApelBlastDto,
    @CurrentAccessContext() authContext: AuthorizationContext,
  ) {
    return apiResult(
      await this.apelService.triggerBlast(dto, authContext.authUserId),
    );
  }

  @Get('sessions')
  @ApiContract({
    operationId: 'apiApel007',
    contractId: 'API-APEL-007',
    summary: 'Riwayat Sesi Apel Jaring',
    access: 'authenticated',
    successStatus: 200,
  })
  async listSessions(@Query() query: ApelSessionQueryDto) {
    return apiResult(await this.apelService.listSessions(query));
  }

  @Get('sessions/:id')
  @ApiContract({
    operationId: 'apiApel008',
    contractId: 'API-APEL-008',
    summary: 'Detail Sesi Apel Jaring & Kehadiran',
    access: 'authenticated',
    successStatus: 200,
  })
  async getSession(@Param('id', ParseUUIDPipe) id: string) {
    return apiResult(await this.apelService.getSession(id));
  }

  @Get('broadcast-targets')
  @ApiContract({
    operationId: 'apiApel010',
    contractId: 'API-APEL-010',
    summary: 'Daftar Sasaran Broadcast Apel (Wilayah, Gaswil, Jaring)',
    access: 'authenticated',
    successStatus: 200,
  })
  async getBroadcastTargets() {
    return apiResult(await this.apelService.getBroadcastTargets());
  }

  @Get('map-data')
  @ApiContract({
    operationId: 'apiApel009',
    contractId: 'API-APEL-009',
    summary: 'Data Visualisasi Peta Koordinat Apel Jaring (Hadir vs Belum)',
    access: 'authenticated',
    successStatus: 200,
  })
  async getMapData(@Query() query: ApelMapDataQueryDto) {
    return apiResult(await this.apelService.getMapData(query));
  }
}
