import { filterHistoryByCategory, type HistoryItem } from '../domain';

const makeItem = (result: string, id = '1'): Pick<HistoryItem, 'result' | 'id'> => ({
  id,
  result,
});

describe('filterHistoryByCategory', () => {
  const history = [
    makeItem('SEHAT', 'a'),
    makeItem('TIDAK SEHAT', 'b'),
    makeItem('SEHAT', 'c'),
    makeItem('BUKAN IKAN CUPANG', 'd'),
    makeItem('tidak sehat', 'e'), // huruf kecil: tetap dikenali via uppercase
  ];

  it('mengembalikan semua item untuk kategori Semua', () => {
    expect(filterHistoryByCategory(history, 'Semua')).toHaveLength(5);
  });

  it('hanya mengembalikan SEHAT untuk kategori Sehat', () => {
    const result = filterHistoryByCategory(history, 'Sehat');
    expect(result.map((i) => i.id)).toEqual(['a', 'c']);
  });

  it('mengembalikan semua hasil sakit (TIDAK SEHAT) untuk kategori Terinfeksi', () => {
    const result = filterHistoryByCategory(history, 'Terinfeksi');
    // 'BUKAN IKAN CUPANG' bukan hasil klasifikasi sakit, jadi dikecualikan
    expect(result.map((i) => i.id)).toEqual(['b', 'e']);
  });

  it('case-insensitive terhadap hasil klasifikasi', () => {
    const lower = [makeItem('sehat', 'x'), makeItem('Tidak Sehat', 'y')];
    expect(filterHistoryByCategory(lower, 'Sehat').map((i) => i.id)).toEqual(['x']);
    expect(filterHistoryByCategory(lower, 'Terinfeksi').map((i) => i.id)).toEqual(['y']);
  });

  it('mengembalikan array kosong untuk input kosong', () => {
    expect(filterHistoryByCategory([], 'Semua')).toEqual([]);
    expect(filterHistoryByCategory([], 'Terinfeksi')).toEqual([]);
  });
});
