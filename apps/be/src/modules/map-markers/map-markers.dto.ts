import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  AdministrativeLevel,
  BaketStatus,
  CoordinateSource,
  PriorityLevel,
} from '../../generated/prisma/client.js';

export enum MapMarkerType {
  REPORT = 'report',
  BAKET = 'baket',
  AGENT = 'agent',
}

export enum ReportValidityFilter {
  VALID = 'VALID',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  WAITING = 'WAITING',
}

export enum ReportLocationSuitabilityFilter {
  WITHIN_SCOPE = 'WITHIN_SCOPE',
  OUTSIDE_SCOPE = 'OUTSIDE_SCOPE',
  BORDER_AMBIGUOUS = 'BORDER_AMBIGUOUS',
  NOT_DETERMINED = 'NOT_DETERMINED',
}

export enum AgentLocationState {
  ACTIVE = 'active',
  LAST_KNOWN = 'last_known',
}

function toList(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];
  return [
    ...new Set(
      values
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

const List = () => Transform(({ value }: { value: unknown }) => toList(value));

const BooleanValue = () =>
  Transform(({ value }: { value: unknown }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  });

export class MapMarkersQuery {
  @IsOptional()
  @List()
  @IsEnum(MapMarkerType, { each: true })
  types: MapMarkerType[] = [MapMarkerType.BAKET, MapMarkerType.AGENT];

  @IsOptional() @IsString() bbox?: string;

  @IsOptional()
  @List()
  @IsUUID('all', { each: true })
  areaIds?: string[];

  @IsOptional() @List() @IsString({ each: true }) areaCodes?: string[];

  @IsOptional()
  @List()
  @IsEnum(AdministrativeLevel, { each: true })
  areaLevels?: AdministrativeLevel[];

  @IsOptional()
  @List()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @IsOptional() @List() @IsString({ each: true }) categoryCodes?: string[];

  @IsOptional()
  @List()
  @IsUUID('4', { each: true })
  jaringIds?: string[];

  @IsOptional()
  @List()
  @IsUUID('4', { each: true })
  fieldOfficerAssignmentIds?: string[];

  @IsOptional()
  @List()
  @IsEnum(ReportValidityFilter, { each: true })
  reportValidity?: ReportValidityFilter[];

  @IsOptional()
  @BooleanValue()
  @IsBoolean()
  hasCoordinates?: boolean;

  @IsOptional()
  @BooleanValue()
  @IsBoolean()
  hasAttachments?: boolean;

  @IsOptional()
  @List()
  @IsEnum(CoordinateSource, { each: true })
  coordinateSources?: CoordinateSource[];

  @IsOptional()
  @List()
  @IsEnum(ReportLocationSuitabilityFilter, { each: true })
  locationSuitability?: ReportLocationSuitabilityFilter[];

  @IsOptional()
  @List()
  @IsEnum(BaketStatus, { each: true })
  baketStatuses?: BaketStatus[];

  @IsOptional()
  @List()
  @IsEnum(PriorityLevel, { each: true })
  urgencies?: PriorityLevel[];

  @IsOptional()
  @List()
  @IsEnum(AgentLocationState, { each: true })
  agentStates?: AgentLocationState[];

  @IsOptional()
  @List()
  @IsUUID('4', { each: true })
  unitIds?: string[];

  @IsOptional()
  @List()
  @IsUUID('4', { each: true })
  assignmentIds?: string[];

  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  activeWithinMinutes = 15;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2160)
  lastKnownWithinHours = 168;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limitPerType = 1000;

  @IsOptional()
  @BooleanValue()
  @IsBoolean()
  includeAreaHierarchy = true;
}
