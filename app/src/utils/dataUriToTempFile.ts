/**
 * Konversi data URI (base64) menjadi file di cache untuk kebutuhan zoom.
 *
 * LATAR (bug zoom): react-native-image-viewing menentukan dimensi gambar
 * memakai `Image.getSize()` native, yang di Android/Expo Go GAGAL memuat
 * data URI besar (onError → dimensi 0x0 → gambar dirender 0x0 → layar
 * hitam/polos saat zoom, meski thumbnail <Image> tampil normal karena
 * komponen itu tidak butuh dimensi awal).
 *
 * Solusi: tulis base64 ke file cache (expo-file-system) — loader native
 * terbukti mampu memuat file cache buatan sendiri (pola yang sama dengan
 * salinan tampilan di result.tsx) — lalu zoom memakai URI file tersebut.
 *
 * File sengaja TIDAK dihapus otomatis setelah dipakai: URI yang sama sering
 * di-zoom berulang (cache in-memory mencegah tulis ulang), dan file cache
 * dibersihkan OS saat storage penuh / app di-reinstall.
 */

import * as FileSystem from 'expo-file-system/legacy';

const tempFileCache = new Map<string, string>();

export const dataUriToTempFile = async (dataUri: string): Promise<string> => {
  const cached = tempFileCache.get(dataUri);
  if (cached) return cached;

  const match = /^data:image\/(\w+);base64,(.+)$/.exec(dataUri);
  if (!match) return dataUri; // Bukan data URI → kembalikan apa adanya

  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const b64 = match[2];
  const path = `${FileSystem.cacheDirectory}zoom_${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`;

  await FileSystem.writeAsStringAsync(path, b64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  tempFileCache.set(dataUri, path);
  return path;
};
