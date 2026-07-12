import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { TaskController } from './task.controller.js';
import { TaskService } from './task.service.js';

@Module({
  imports: [AccessModule],
  controllers: [TaskController],
  providers: [TaskService],
})
export class TaskModule {}
