import { jest } from '@jest/globals';
import { normalizeIpAddress, resolveIpLocation } from './ip-location.js';

describe('normalizeIpAddress', () => {
  it.each([
    ['203.0.113.7', '203.0.113.7'],
    ['203.0.113.7, 10.0.0.2', '203.0.113.7'],
    ['::ffff:203.0.113.7', '203.0.113.7'],
    ['203.0.113.7:443', '203.0.113.7'],
    ['2001:db8::7', '2001:db8::7'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeIpAddress(input)).toBe(expected);
  });

  it.each([
    null,
    '',
    '::',
    '0.0.0.0',
    '0000:0000:0000:0000:0000:0000:0000:0000',
    'Unknown IP',
  ])('rejects unavailable or invalid address %s', (input) => {
    expect(normalizeIpAddress(input)).toBeNull();
  });

  it('mengambil city dari ip-api.com untuk public IP', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'success',
          query: '8.8.4.4',
          city: 'Mountain View',
          regionName: 'California',
          country: 'United States',
          countryCode: 'US',
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json', 'x-rl': '44' },
        },
      ),
    );

    await expect(resolveIpLocation('8.8.4.4')).resolves.toMatchObject({
      label: 'Mountain View',
      city: 'Mountain View',
      region: 'California',
      country: 'United States',
      countryCode: 'US',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('http://ip-api.com/json/8.8.4.4'),
      expect.anything(),
    );

    fetchMock.mockRestore();
  });
});
