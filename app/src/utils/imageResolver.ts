/**
 * Resolver sumber gambar terpusat untuk render <Image />.
 *
 * Field `image` di database disimpan sebagai salah satu dari:
 *  - string key asset   : 'healthy_halfmoon' | 'healthy_plakat' | 'fungus' | 'fin_rot'
 *  - data URI / URI jaringan : 'data:image/...' | 'http(s)://...'
 *  - string kosong      : gambar hilang / rusak → pakai placeholder
 *
 * Angka hasil require() (dari data lama) juga diterima demi kompatibilitas.
 */

// Placeholder dipakai bila tidak ada gambar valid, agar <Image> tidak menerima
// source undefined/null (penyebab utama gambar "hilang" di UI).
// @ts-ignore -- require diketik sebagai number oleh Metro, aman dipakai langsung.
const PLACEHOLDER = require('../../assets/images/healthy_halfmoon_1785166203088.png');

const ASSET_MAP: Record<string, number> = {
  healthy_halfmoon: require('../../assets/images/healthy_halfmoon_1785166203088.png'),
  healthy_plakat: require('../../assets/images/healthy_plakat_1785166214003.png'),
  fungus: require('../../assets/images/fungus_betta_1785166221873.png'),
  fin_rot: require('../../assets/images/fin_rot_betta_1785166232872.png'),
};

export const resolveImage = (imageOrPath: any) => {
  if (imageOrPath === null || imageOrPath === undefined) return PLACEHOLDER;
  if (typeof imageOrPath === 'number') return imageOrPath; // Asset module lokal (data lama)

  if (typeof imageOrPath === 'string') {
    if (imageOrPath.length === 0) return PLACEHOLDER; // Tanpa gambar → placeholder

    // Data URI (thumbnail base64) atau URI jaringan → biarkan RN memuat via uri.
    if (
      imageOrPath.startsWith('data:') ||
      imageOrPath.startsWith('http://') ||
      imageOrPath.startsWith('https://')
    ) {
      return { uri: imageOrPath };
    }

    // file:// LOKAL SENGJAHA DITOLAK: URI cache kamera mati setelah cache app
    // dibersihkan, sehingga riwayat lama tampil kosong. Data dengan file://
    // dianggap sudah tidak valid → placeholder.
    if (imageOrPath.startsWith('file://')) return PLACEHOLDER;

    // Key asset bernama (format penyimpanan baru).
    const assetKey = ASSET_MAP[imageOrPath];
    if (assetKey !== undefined) return assetKey;

    // Key lama berformat nama-file (mis. 'fungus_betta_1785166221873.png').
    if (imageOrPath.includes('healthy_plakat')) return ASSET_MAP.healthy_plakat;
    if (imageOrPath.includes('healthy_halfmoon')) return ASSET_MAP.healthy_halfmoon;
    if (imageOrPath.includes('fungus')) return ASSET_MAP.fungus;
    if (imageOrPath.includes('fin_rot')) return ASSET_MAP.fin_rot;

    // String tak dikenal (bukan key/URI valid) → placeholder.
    return PLACEHOLDER;
  }

  // Bentuk lain (mis. { uri }) → teruskan apa adanya.
  return imageOrPath;
};

export function getResolvedSource(imageOrObj: any): any {
  if (imageOrObj === null || imageOrObj === undefined) return null;

  let raw = imageOrObj;
  if (typeof imageOrObj === 'object' && imageOrObj !== null) {
    if (imageOrObj.uri !== undefined) {
      raw = imageOrObj.uri;
    } else {
      return imageOrObj;
    }
  }

  if (typeof raw === 'number') {
    return raw;
  }

  if (typeof raw === 'string') {
    if (raw.length === 0) return null;

    // file:// URI
    if (raw.startsWith('file://')) {
      return { uri: raw };
    }

    // http(s):// or data: URI
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
      return { uri: raw };
    }

    // Raw base64 tanpa prefix data:image/...
    if (raw.startsWith('/9j/') || raw.startsWith('iVBORw') || (raw.length > 100 && !raw.includes(' '))) {
      return { uri: `data:image/jpeg;base64,${raw}` };
    }

    // Asset key bernama (seperti 'healthy_halfmoon', dsb.)
    return resolveImage(raw);
  }

  return resolveImage(raw);
}
