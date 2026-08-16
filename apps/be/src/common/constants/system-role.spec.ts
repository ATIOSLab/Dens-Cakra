import { SYSTEM_ROLE_CATALOG, SYSTEM_ROLES } from './system-role.js';

describe('SYSTEM_ROLE_CATALOG', () => {
  it('keeps technical role keys stable while exposing canonical Indonesian labels', () => {
    expect(SYSTEM_ROLE_CATALOG.map((role) => role.key)).toEqual([
      SYSTEM_ROLES.EXECUTIVE,
      SYSTEM_ROLES.REGIONAL_COMMANDER,
      SYSTEM_ROLES.FIELD_COORDINATOR,
      SYSTEM_ROLES.FIELD_OFFICER,
      SYSTEM_ROLES.ADMIN_SYSTEM,
    ]);

    expect(
      SYSTEM_ROLE_CATALOG.find(
        (role) => role.key === SYSTEM_ROLES.FIELD_OFFICER,
      )?.label,
    ).toBe('Petugas Wilayah (Gaswil)');
  });
});
