import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateSystemConfigDto {
  @IsOptional()
  @IsBoolean()
  coachingReportEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  coachingReportActivePeriod?: number;
}
