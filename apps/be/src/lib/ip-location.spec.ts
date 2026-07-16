import { normalizeIpAddress } from './ip-location.js';

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
});
