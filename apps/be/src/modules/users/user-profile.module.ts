import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { UserProfileController } from './user-profile.controller.js';
import { UserProfileService } from './user-profile.service.js';

@Module({
  imports: [AccessModule],
  controllers: [UserProfileController],
  providers: [UserProfileService],
})
export class UserProfileModule {}
