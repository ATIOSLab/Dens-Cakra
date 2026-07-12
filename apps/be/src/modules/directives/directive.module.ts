import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { DirectiveController } from './directive.controller.js';
import { DirectiveService } from './directive.service.js';

@Module({
  imports: [AccessModule],
  controllers: [DirectiveController],
  providers: [DirectiveService],
})
export class DirectiveModule {}
