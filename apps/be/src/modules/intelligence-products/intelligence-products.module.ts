import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { SpatialModule } from '../spatial/spatial.module.js';
import { IntelligenceProductsController } from './intelligence-products.controller.js';
import { IntelligenceProductsService } from './intelligence-products.service.js';

@Module({
  imports: [AccessModule, SpatialModule],
  controllers: [IntelligenceProductsController],
  providers: [IntelligenceProductsService],
})
export class IntelligenceProductsModule {}
