import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { PositionController } from './position.controller.js';
import { PositionMutationService } from './position-mutation.service.js';
import { PositionQueryService } from './position-query.service.js';
import { PositionService } from './position.service.js';
@Module({
  imports: [AccessModule],
  controllers: [PositionController],
  providers: [PositionService, PositionQueryService, PositionMutationService],
})
export class PositionModule {}
