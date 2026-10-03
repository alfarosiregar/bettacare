import { getWeeklyChartData } from '../chartUtils';

describe('getWeeklyChartData', () => {
  it('mengembalikan 7 bucket hari', () => {
    const result = getWeeklyChartData([]);
    expect(result).toHaveLength(7);
  });

  it('menghitung item "Hari ini" ke bucket terakhir', () => {
    const result = getWeeklyChartData([
      { date: 'Hari ini', result: 'SEHAT' },
      { date: 'Hari ini', result: 'TIDAK SEHAT' },
    ]);
    const today = result[6];
    expect(today.total).toBe(2);
    expect(today.healthy).toBe(1);
  });

  it('menghitung item "Kemarin" ke bucket ke-6', () => {
    const result = getWeeklyChartData([{ date: 'Kemarin', result: 'SEHAT' }]);
    expect(result[5].total).toBe(1);
    expect(result[5].healthy).toBe(1);
    expect(result[6].total).toBe(0);
  });

  it('mengabaikan item tanpa tanggal yang cocok (di luar 7 hari)', () => {
    const result = getWeeklyChartData([{ date: '12/01/2020', result: 'SEHAT' }]);
    expect(result.reduce((acc, b) => acc + b.total, 0)).toBe(0);
  });

  it('tidak crash untuk input non-array / null-ish', () => {
    expect(getWeeklyChartData(undefined as any)).toHaveLength(7);
    expect(getWeeklyChartData(null as any)).toHaveLength(7);
  });
});
