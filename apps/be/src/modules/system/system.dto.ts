import { IsBoolean } from 'class-validator';

export class UpdateSystemConfigDto {
  @IsBoolean()
  coachingReportEnabled!: boolean;
}
