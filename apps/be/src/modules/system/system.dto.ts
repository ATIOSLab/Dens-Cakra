import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { LocationRequirement } from '../../generated/prisma/client.js';

export class UpdateSystemConfigDto {
  @IsOptional()
  @IsBoolean()
  coachingReportEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  coachingReportActivePeriod?: number;

  @IsOptional()
  @IsEnum(LocationRequirement)
  whatsappLocationRequirement?: LocationRequirement;
}
