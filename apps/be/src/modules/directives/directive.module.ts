import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { DirectiveController } from './directive.controller.js';
import { DirectiveAiService } from './directive-ai.service.js';
import { DirectiveService } from './directive.service.js';

@Module({
  imports: [AccessModule],
  controllers: [DirectiveController],
  providers: [DirectiveService, DirectiveAiService],
})
export class DirectiveModule {}
