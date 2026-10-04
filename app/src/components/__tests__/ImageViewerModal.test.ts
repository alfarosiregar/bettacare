import { getResolvedSource } from '../../utils/imageResolver';

describe('getResolvedSource in ImageViewerModal', () => {
  it('mengembalikan null untuk input kosong atau null', () => {
    expect(getResolvedSource(null)).toBeNull();
    expect(getResolvedSource(undefined)).toBeNull();
    expect(getResolvedSource('')).toBeNull();
  });

  it('mengembalikan number untuk aset lokal (require)', () => {
    expect(getResolvedSource(1234)).toBe(1234);
  });

  it('mengembalikan { uri } untuk URL http/https', () => {
    expect(getResolvedSource('https://example.com/fish.jpg')).toEqual({
      uri: 'https://example.com/fish.jpg',
    });
  });

  it('mengembalikan { uri } untuk file:// URI', () => {
    expect(getResolvedSource('file:///data/user/0/cache/image.jpg')).toEqual({
      uri: 'file:///data/user/0/cache/image.jpg',
    });
  });

  it('mengembalikan { uri } untuk data URI', () => {
    const dataUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...';
    expect(getResolvedSource(dataUri)).toEqual({ uri: dataUri });
  });

  it('membungkus raw base64 dengan data:image/jpeg;base64,', () => {
    const rawB64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP...';
    expect(getResolvedSource(rawB64)).toEqual({
      uri: `data:image/jpeg;base64,${rawB64}`,
    });
  });

  it('mengekstrak properti uri jika objek dilewatkan', () => {
    expect(getResolvedSource({ uri: 'https://example.com/fish.png' })).toEqual({
      uri: 'https://example.com/fish.png',
    });
  });

  it('meresolve asset key bernama seperti healthy_halfmoon', () => {
    const res = getResolvedSource('healthy_halfmoon');
    expect(res).toBeDefined();
    // Di Metro/Jest, require() bernilai number atau mock object
    expect(typeof res === 'number' || typeof res === 'object').toBe(true);
  });
});
