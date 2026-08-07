import { parseStorageByteRange } from './storage-transport.controller.js';

describe('parseStorageByteRange', () => {
  it('returns null when no range is requested', () => {
    expect(parseStorageByteRange(undefined, 1_000)).toBeNull();
  });

  it.each([
    ['bytes=0-99', { start: 0, end: 99 }],
    ['bytes=900-', { start: 900, end: 999 }],
    ['bytes=-100', { start: 900, end: 999 }],
    ['bytes=900-1200', { start: 900, end: 999 }],
  ])('parses %s', (value, expected) => {
    expect(parseStorageByteRange(value, 1_000)).toEqual(expected);
  });

  it.each([
    'bytes=',
    'items=0-10',
    'bytes=100-99',
    'bytes=1000-',
    'bytes=0-1,3-4',
  ])('rejects invalid or unsupported range %s', (value) => {
    expect(parseStorageByteRange(value, 1_000)).toBeUndefined();
  });
});
