import { Module } from '@nestjs/common';
import { SpatialRepository } from './spatial.repository.js';

@Module({
  providers: [SpatialRepository],
  exports: [SpatialRepository],
})
export class SpatialModule {}
