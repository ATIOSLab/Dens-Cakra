import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { UukController } from './uuk.controller.js';
import { UukService } from './uuk.service.js';

@Module({
  imports: [AccessModule],
  controllers: [UukController],
  providers: [UukService],
})
export class UukModule {}
