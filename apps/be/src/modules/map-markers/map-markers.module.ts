import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { MapMarkersController } from './map-markers.controller.js';
import { MapMarkersService } from './map-markers.service.js';
import { MapMarkersSpatialRepository } from './map-markers.spatial.repository.js';

@Module({
  imports: [AccessModule],
  controllers: [MapMarkersController],
  providers: [MapMarkersService, MapMarkersSpatialRepository],
})
export class MapMarkersModule {}
