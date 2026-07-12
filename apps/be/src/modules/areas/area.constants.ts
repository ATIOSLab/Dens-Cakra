import { AdministrativeLevel } from '../../generated/prisma/client.js';

export const PARENT_LEVELS: Partial<
  Record<AdministrativeLevel, readonly AdministrativeLevel[]>
> = {
  PROVINCE: [AdministrativeLevel.COUNTRY],
  REGENCY: [AdministrativeLevel.PROVINCE],
  CITY: [AdministrativeLevel.PROVINCE],
  DISTRICT: [AdministrativeLevel.REGENCY, AdministrativeLevel.CITY],
  VILLAGE: [AdministrativeLevel.DISTRICT],
  URBAN_VILLAGE: [AdministrativeLevel.DISTRICT],
  RW: [AdministrativeLevel.VILLAGE, AdministrativeLevel.URBAN_VILLAGE],
  RT: [AdministrativeLevel.RW],
};
