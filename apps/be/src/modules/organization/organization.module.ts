import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { OrganizationController } from './organization.controller.js';
import { OrganizationManagementService } from './organization-management.service.js';

@Module({
  imports: [AccessModule],
  controllers: [OrganizationController],
  providers: [OrganizationManagementService],
})
export class OrganizationModule {}
