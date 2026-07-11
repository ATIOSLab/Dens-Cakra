import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { SpatialModule } from '../spatial/spatial.module.js';
import { BaketController } from './baket.controller.js';
import { BaketCoverageService } from './baket-coverage.service.js';
import { BaketQueryService } from './baket-query.service.js';
import { BaketService } from './baket.service.js';
import { BaketVerificationService } from './baket-verification.service.js';

@Module({
  imports: [AccessModule, SpatialModule],
  providers: [
    BaketService,
    BaketQueryService,
    BaketCoverageService,
    BaketVerificationService,
  ],
  controllers: [BaketController],
})
export class BaketModule {}
