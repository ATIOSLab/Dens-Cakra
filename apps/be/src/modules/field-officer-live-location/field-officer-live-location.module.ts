import { Module } from '@nestjs/common';
import { FieldOfficerLiveLocationController } from './field-officer-live-location.controller.js';
import { FieldOfficerLiveLocationService } from './field-officer-live-location.service.js';

@Module({
  controllers: [FieldOfficerLiveLocationController],
  providers: [FieldOfficerLiveLocationService],
})
export class FieldOfficerLiveLocationModule {}
