import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

type UpsertFieldOfficerLiveLocationBody = {
  accuracy?: number | null;
  altitude?: number | null;
  capturedAt?: string;
  fieldOfficerId?: string;
  fieldOfficerName?: string | null;
  heading?: number | null;
  latitude?: number;
  longitude?: number;
  sector?: string | null;
  source?: string;
  speed?: number | null;
  title?: string | null;
};

@Injectable()
export class FieldOfficerLiveLocationService {
  constructor(private readonly prisma: PrismaService) {}

  async listLocations() {
    const [locations, fieldOfficers] = await Promise.all([
      this.prisma.fieldOfficerLiveLocation.findMany({
        orderBy: {
          updatedAt: 'desc',
        },
      }),
      this.prisma.whatsappAllowedUser.findMany({
        where: {
          role: 'FIELD_OFFICER',
        },
        orderBy: {
          name: 'asc',
        },
      }),
    ]);

    const locationByFieldOfficerId = new Map(
      locations.map((location) => [location.fieldOfficerId, location]),
    );

    return fieldOfficers.map((fieldOfficer) => {
      const fieldOfficerId =
        fieldOfficer.fieldOfficerUsername ||
        fieldOfficer.whatsappId.replace(/^field-officer:/, '');
      const location = locationByFieldOfficerId.get(fieldOfficerId);

      if (location) {
        return {
          ...location,
          hasGpsLocation: true,
          locationStatus: 'LIVE',
        };
      }

      const fallback = this.getFallbackCoordinate(fieldOfficerId, fieldOfficer.name);

      return {
        id: fieldOfficer.id,
        fieldOfficerId,
        fieldOfficerName: fieldOfficer.name,
        title: 'Collection Owner',
        sector: this.formatSector(fieldOfficerId),
        latitude: fallback.latitude,
        longitude: fallback.longitude,
        accuracy: null,
        altitude: null,
        heading: null,
        speed: null,
        source: 'missing-gps',
        capturedAt: null,
        createdAt: fieldOfficer.createdAt,
        updatedAt: null,
        hasGpsLocation: false,
        locationStatus: 'MISSING_GPS',
      };
    });
  }

  listRawLocations() {
    return this.prisma.fieldOfficerLiveLocation.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  upsertLocation(body: UpsertFieldOfficerLiveLocationBody) {
    const fieldOfficerId = body.fieldOfficerId?.trim();
    if (!fieldOfficerId) throw new BadRequestException('Field Officer wajib tersedia');

    const latitude = this.requiredCoordinate(body.latitude, 'Latitude');
    const longitude = this.requiredCoordinate(body.longitude, 'Longitude');
    const capturedAt = body.capturedAt ? new Date(body.capturedAt) : new Date();

    if (Number.isNaN(capturedAt.getTime())) {
      throw new BadRequestException('Timestamp lokasi tidak valid');
    }

    return this.prisma.fieldOfficerLiveLocation.upsert({
      where: {
        fieldOfficerId,
      },
      create: {
        fieldOfficerId,
        fieldOfficerName: body.fieldOfficerName || null,
        title: body.title || null,
        sector: body.sector || null,
        latitude,
        longitude,
        accuracy: this.optionalNumber(body.accuracy),
        altitude: this.optionalNumber(body.altitude),
        heading: this.optionalNumber(body.heading),
        speed: this.optionalNumber(body.speed),
        source: body.source || 'browser',
        capturedAt,
      },
      update: {
        fieldOfficerName: body.fieldOfficerName || null,
        title: body.title || null,
        sector: body.sector || null,
        latitude,
        longitude,
        accuracy: this.optionalNumber(body.accuracy),
        altitude: this.optionalNumber(body.altitude),
        heading: this.optionalNumber(body.heading),
        speed: this.optionalNumber(body.speed),
        source: body.source || 'browser',
        capturedAt,
      },
    });
  }

  private requiredCoordinate(value: number | undefined, label: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(`${label} lokasi tidak valid`);
    }

    return parsed;
  }

  private optionalNumber(value?: number | null) {
    if (value === undefined || value === null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private getFallbackCoordinate(fieldOfficerId: string, name?: string | null) {
    const normalized = `${fieldOfficerId} ${name || ''}`.toLowerCase();

    if (normalized.includes('pekanbaru')) {
      return {
        latitude: 0.5071,
        longitude: 101.4478,
      };
    }

    if (normalized.includes('bangkinang')) {
      return {
        latitude: 0.3352,
        longitude: 101.0284,
      };
    }

    return {
      latitude: 0.7893,
      longitude: 113.9213,
    };
  }

  private formatSector(fieldOfficerId: string) {
    return fieldOfficerId
      .replace(/^fo-/, '')
      .replace(/-\d+$/, '')
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Field Sector';
  }
}
