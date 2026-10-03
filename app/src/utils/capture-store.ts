/**
 * Jembatan data hasil capture kamera → layar Result.
 *
 * LATAR BELAKANG (bug Android/Expo Go):
 * `FileSystem.uploadAsync` gagal membaca file cache kamera hasil
 * `takePictureAsync` (SDK 57) dengan error native
 * `java.io.IOException: Location ... isn't readable` — terjadi SEBELUM
 * request HTTP dikirim. Solusinya: kirim langsung base64 dari memori
 * (hasil `takePictureAsync({ base64: true })`), tanpa menyentuh file.
 *
 * Modul ini menyimpan output capture terakhir agar tidak lewat router
 * params (base64 besar akan melampaui batas URL Intent Android).
 */

export interface CaptureData {
  /** Base64 murni TANPA prefix data URI (bila tersedia dari kamera). */
  base64?: string;
  /** URI file lokal (file://...) — fallback bila base64 tidak tersedia. */
  uri?: string;
  /** Kualitas kompresi yang dipakai saat capture. */
  quality?: number;
}

let lastCapture: CaptureData | null = null;

export function setLastCapture(data: CaptureData | null): void {
  lastCapture = data;
}

export function getLastCapture(): CaptureData | null {
  return lastCapture;
}
