import { formatHistoryDate } from '../dateUtils';

describe('formatHistoryDate', () => {
  it('memformat tanggal hari ini dengan waktu WIB', () => {
    const now = new Date();
    const result = formatHistoryDate(now.toISOString());
    expect(result).toMatch(/^Hari ini, \d{2}:\d{2} WIB$/);
  });

  it('memformat tanggal kemarin dengan waktu WIB', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = formatHistoryDate(yesterday.toISOString());
    expect(result).toMatch(/^Kemarin, \d{2}:\d{2} WIB$/);
  });

  it('memformat tanggal beberapa hari lalu di tahun yang sama', () => {
    const someDaysAgo = new Date();
    someDaysAgo.setDate(someDaysAgo.getDate() - 5);
    // Asalkan bukan hari ini / kemarin
    if (someDaysAgo.getFullYear() === new Date().getFullYear()) {
      const result = formatHistoryDate(someDaysAgo.toISOString());
      expect(result).toMatch(/^\d{1,2} [A-Z][a-z]{2}, \d{2}:\d{2} WIB$/);
    }
  });

  it('memformat tanggal tahun lalu', () => {
    const lastYear = new Date('2024-05-20T10:15:00Z');
    const result = formatHistoryDate(lastYear.toISOString());
    expect(result).toContain('2024');
    expect(result).toContain('Mei');
    expect(result).toContain('WIB');
  });

  it('menggunakan fallbackDate jika createdAt tidak valid atau kosong', () => {
    expect(formatHistoryDate(null, 'Hari ini, 08:00 WIB')).toBe('Hari ini, 08:00 WIB');
    expect(formatHistoryDate('invalid-date', 'Fallback Date')).toBe('Fallback Date');
  });
});
