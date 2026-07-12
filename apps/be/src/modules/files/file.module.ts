import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { FileController } from './file.controller.js';
import { FileService } from './file.service.js';
@Module({
  imports: [AccessModule],
  controllers: [FileController],
  providers: [FileService],
})
export class FileModule {}
