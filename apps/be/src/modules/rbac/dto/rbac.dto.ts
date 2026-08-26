import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class RoleListQueryDto {
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class SetRolePermissionsDto {
  @IsArray() @IsUUID(undefined, { each: true }) permissionIds!: string[];
}
