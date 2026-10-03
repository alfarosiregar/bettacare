/**
 * Tipe domain bersama untuk data yang disimpan di Firebase RTDB
 * dan fungsi murni terkait (mudah di-unit-test).
 */

export type ClassificationResult = 'SEHAT' | 'TIDAK SEHAT' | 'BUKAN IKAN CUPANG';

export interface FeatureAnalysis {
  rgb_averages?: {
    r?: number;
    g?: number;
    b?: number;
  };
  glcm?: {
    contrast?: number;
    correlation?: number;
    energy?: number;
    homogeneity?: number;
  };
  /** Visualisasi proses ekstraksi (data URI JPEG dari backend).
   * Semua field opsional — scan lama & kegagalan render backend → undefined. */
  visualizations?: {
    grayscale?: string;
    channel_r?: string;
    channel_g?: string;
    channel_b?: string;
    glcm_heatmap?: string;
    histogram_rgb?: string;
  };
}

/** Probabilitas mentah per kelas dari model (persentase 0–100). */
export interface ClassProbabilities {
  SEHAT?: number;
  'TIDAK SEHAT'?: number;
}

/** Skor verifikasi objek (OOD) — transparansi penolakan "BUKAN IKAN CUPANG". */
export interface OodInfo {
  similarity?: number;
  threshold?: number;
  animal_detected?: boolean;
  passed?: boolean;
}

/** Metadata proses analisis — traceability untuk dokumentasi skripsi. */
export interface ScanMeta {
  analyzed_at?: string;
  latency_ms?: number;
  model?: string;
  backend?: string;
  features?: string;
}

export interface HistoryItem {
  id: string;
  title?: string;
  date: string;
  result: string;
  image?: string | number;
  confidence?: number;
  features?: FeatureAnalysis | null;
  ai_analysis?: string | null;
  createdAt?: string;
  probabilities?: ClassProbabilities;
  ood?: OodInfo;
  meta?: ScanMeta;
}

export interface AquariumFish {
  id: string;
  name: string;
  status: string;
  image?: string | number;
}

export interface Task {
  id: string;
  title: string;
  time: string;
  aquariumId: string;
  completed: boolean;
}

export interface MaintenanceLog {
  id: string;
  taskId: string;
  title: string;
  aquariumId: string;
  completedAt: string;
}

/* ── Kategori riwayat ──────────────────────────────────────────────── */

export type HistoryCategory = 'Semua' | 'Sehat' | 'Terinfeksi';

/**
 * Filter riwayat berdasarkan kategori. Dipakai bersama oleh layar riwayat
 * dan layar riwayat terfilter agar perilaku konsisten.
 *
 * - 'Semua'       : semua item
 * - 'Sehat'       : hasil 'SEHAT'
 * - 'Terinfeksi'  : semua hasil selain 'SEHAT' dan 'BUKAN IKAN CUPANG'
 *                   (dulu berbasis daftar penyakit yang tak pernah cocok
 *                   dengan output model SEHAT/TIDAK SEHAT — bug sudah difix)
 */
export function filterHistoryByCategory<T extends Pick<HistoryItem, 'result'>>(
  history: T[],
  category: HistoryCategory
): T[] {
  if (category === 'Semua') return history;
  if (category === 'Sehat') return history.filter((item) => item.result.toUpperCase() === 'SEHAT');
  return history.filter((item) => {
    const r = item.result.toUpperCase();
    return r !== 'SEHAT' && r !== 'BUKAN IKAN CUPANG';
  });
}
