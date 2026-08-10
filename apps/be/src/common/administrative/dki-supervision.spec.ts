import { AdministrativeLevel } from '../../generated/prisma/client.js';
import {
  belongsToDkiJakartaProvince,
  DKI_SUPERVISION_RBAC_POLICY,
  isDkiJakartaProvince,
  isDkiJakartaRegencyCity,
} from './dki-supervision.js';

describe('DKI supervision helpers', () => {
  const dkiProvince = {
    code: '31',
    officialCode: '31',
    name: 'Daerah Khusus Ibukota Jakarta',
    level: AdministrativeLevel.PROVINCE,
  };

  it('documents the RBAC policy for configurable DKI Directorate/Ditwil supervision', () => {
    expect(DKI_SUPERVISION_RBAC_POLICY).toMatchObject({
      policyId: 'RBAC-DKI-DIRECTORATE-SUPERVISION',
      storageModel: 'UserOperationalAssignment.areaScopes',
      allowsMultipleRegencyCitiesPerDirectorate: true,
      allowsMultipleDirectoratesPerRegencyCity: true,
      forbidsHardcodedDirectorateCityAssignment: true,
      commandLineUnchanged: true,
    });
  });

  it('identifies DKI Jakarta province without encoding directorate-city assignments', () => {
    expect(isDkiJakartaProvince(dkiProvince)).toBe(true);
    expect(
      isDkiJakartaProvince({
        code: '32',
        officialCode: '32',
        name: 'Jawa Barat',
        level: AdministrativeLevel.PROVINCE,
      }),
    ).toBe(false);
  });

  it('accepts DKI regency/city descendants as directorate supervision scope', () => {
    const jakartaSelatan = {
      code: '31.74',
      officialCode: '31.74',
      name: 'Kota Administrasi Jakarta Selatan',
      level: AdministrativeLevel.CITY,
      ancestorLinks: [{ ancestor: dkiProvince }],
    };

    expect(belongsToDkiJakartaProvince(jakartaSelatan)).toBe(true);
    expect(isDkiJakartaRegencyCity(jakartaSelatan)).toBe(true);
  });

  it('does not depend on a hardcoded DKI city assignment list', () => {
    const configurableDkiCity = {
      code: '31.dynamic',
      officialCode: '31.dynamic',
      name: 'Kota Administrasi Dinamis',
      level: AdministrativeLevel.CITY,
      ancestorLinks: [{ ancestor: dkiProvince }],
    };

    expect(isDkiJakartaRegencyCity(configurableDkiCity)).toBe(true);
  });

  it('keeps DKI Directorate/Ditwil supervision at city/regency level only', () => {
    expect(
      isDkiJakartaRegencyCity({
        code: '31.74.01',
        officialCode: '31.74.01',
        name: 'Kecamatan Tebet',
        level: AdministrativeLevel.DISTRICT,
        ancestorLinks: [{ ancestor: dkiProvince }],
      }),
    ).toBe(false);
  });

  it('rejects non-DKI regency/city areas for the DKI-only exception', () => {
    expect(
      isDkiJakartaRegencyCity({
        code: '32.73',
        officialCode: '32.73',
        name: 'Kota Bandung',
        level: AdministrativeLevel.CITY,
        ancestorLinks: [
          {
            ancestor: {
              code: '32',
              officialCode: '32',
              name: 'Jawa Barat',
              level: AdministrativeLevel.PROVINCE,
            },
          },
        ],
      }),
    ).toBe(false);
  });
});
