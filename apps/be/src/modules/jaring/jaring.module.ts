import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { JaringController } from './jaring.controller.js';
import { JaringService } from './jaring.service.js';

@Module({
  imports: [AccessModule],
  controllers: [JaringController],
  providers: [JaringService],
})
export class JaringModule {}
