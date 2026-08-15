import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { apiResult } from '../../common/api/api-response.js';
import { HealthService } from './health.service.js';

@ApiTags('27. System Administration & Reference Data')
@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('live')
  @ApiContract({
    operationId: 'apiSys005',
    contractId: 'API-SYS-005',
    summary: 'Liveness probe',
    access: 'public-internal',
  })
  getLiveness() {
    return apiResult({
      status: 'ok',
      service: 'dens-cakra-backend',
    });
  }

  @Get('ready')
  @ApiContract({
    operationId: 'apiSys006',
    contractId: 'API-SYS-006',
    summary: 'Readiness probe',
    access: 'public-internal',
  })
  async getReadiness() {
    return apiResult(await this.health.checkReadiness());
  }
}
