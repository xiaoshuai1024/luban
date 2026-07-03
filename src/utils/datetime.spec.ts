import { describe, it, expect } from 'vitest';
import { formatDateTime } from './datetime';

describe('formatDateTime', () => {
  it('formats a valid Date', () => {
    const result = formatDateTime(new Date('2026-06-27T10:30:00.000Z'));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('returns empty for undefined', () => {
    expect(formatDateTime()).toBe('');
  });

  it('returns empty for null', () => {
    expect(formatDateTime(null as unknown as Date)).toBe('');
  });

  it('pads single digit values', () => {
    const result = formatDateTime(new Date(2026, 0, 1, 1, 1, 1));
    expect(result).toBe('2026-01-01 01:01:01');
  });
});
