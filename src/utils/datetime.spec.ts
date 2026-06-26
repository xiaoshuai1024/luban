import { describe, it, expect } from 'vitest';
import { formatDateTime } from './datetime';

describe('formatDateTime', () => {
  it('formats a Date to YYYY-MM-DD HH:mm:ss', () => {
    const date = new Date('2026-06-27T10:30:45.000Z');
    const result = formatDateTime(date);
    // 格式应该是 YYYY-MM-DD HH:mm:ss（具体时区取决于本地）
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('handles undefined by returning empty string', () => {
    const result = formatDateTime();
    expect(result).toBe('');
  });
});
