import { Body, Controller, Get, Post } from '@nestjs/common';
import { FieldOfficerLiveLocationService } from './field-officer-live-location.service.js';

@Controller('field-officer/live-locations')
export class FieldOfficerLiveLocationController {
  constructor(private readonly liveLocationService: FieldOfficerLiveLocationService) {}

  @Get()
  listLocations() {
    return this.liveLocationService.listLocations();
  }

  @Post()
  upsertLocation(
    @Body() body: Parameters<FieldOfficerLiveLocationService['upsertLocation']>[0],
  ) {
    return this.liveLocationService.upsertLocation(body);
  }
}
