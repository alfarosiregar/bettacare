import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { FeatureAnalysis, OodInfo, ScanMeta, ClassProbabilities } from '../types/domain';

/**
 * Kartu wawasan analisis — dipakai bersama oleh layar Hasil Analisis
 * (result.tsx) dan Detail Analisis riwayat (history-detail.tsx).
 *
 * Susunan modul (piramida terbalik: vonis → ringkasan → bukti → lampiran):
 *   1. OodWarningCard      — peringatan "Foto Kurang Lazim" (dirender
 *                            terpisah oleh layar, tepat setelah foto utama)
 *   2. AnalysisInsights    — Probabilitas per Kelas → Rekomendasi Tindakan
 *                            → Fitur & Interpretasi (kartu gabungan: nilai
 *                            mentah + narasi dalam satu kartu)
 *   3. TechnicalDetailsCard — Verifikasi Objek (OOD) + Info Analisis
 *                            digabung sebagai lampiran teknis
 *
 * Interpretasi fitur memakai ambang heuristik untuk memberi konteks naratif
 * atas angka GLCM (bukan diagnosis) — cocok untuk demonstrasi pemahaman fitur.
 */

interface InsightTone {
  cardBg: string;
  cardBorder: string;
  textColor: string;
  textMuted: string;
  primary: string;
  danger: string;
}

/** Di bawah ambang ini kemiripan citra dengan dataset latih dianggap
 * meragukan — hasil analisis berpotensi tidak dapat diandalkan
 * (domain shift: gaya foto berbeda jauh dari kondisi pelatihan).
 * Angka HARUS sama dengan OOD_THRESHOLD di backend main.py. */
const OOD_WARN_THRESHOLD = 0.63;

const StatBar = ({
  label,
  pct,
  color,
  track,
  text,
}: {
  label: string;
  pct: number;
  color: string;
  track: string;
  text: string;
}) => (
  <View style={styles.probRow}>
    <Text style={[styles.probLabel, { color: text }]}>{label}</Text>
    <View style={[styles.probTrack, { backgroundColor: track }]}>
      <View style={[styles.probFill, { width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }]} />
    </View>
    <Text style={[styles.probValue, { color: text }]}>{pct.toFixed(1)}%</Text>
  </View>
);

/**
 * Kalibrasi ambang dari STATISTIK DATASET NYATA (sampel n=15/kelas,
 * dihitung dengan pipeline ekstraksi yang sama: resize 224 → grayscale
 * → GLCM distance=1, angle=0).
 *
 * Temuan penting: rata-rata kontras ikan SEHAT justru LEBIH TINGGI
 * (89.3 vs 64.9) — berlawanan dengan asumsi umum — dan rentang antar
 * kelas saling tumpang tindih. Artinya GLCM saja TIDAK diskriminatif;
 * teks interpretasi tidak boleh mengklaim penyakit dari satu nilai.
 */
const DATASET_MID = {
  contrast: 77.1, // titik tengah rata-rata SEHAT (89.3) vs TIDAK SEHAT (64.9)
  correlation: 0.979, // 0.974 vs 0.983
  energy: 0.036, // 0.038 vs 0.034
  homogeneity: 0.373, // 0.383 vs 0.363
};

/** Satu baris insight: nilai fitur (mentah) + narasi interpretasinya. */
interface FeatureInsight {
  label: string;
  value: string;
  color: string;
  text: string | null;
}

/**
 * Interpretasi fitur ADAPTIF terhadap vonis model.
 *
 * Prinsip: nilai individual HANYA dibandingkan dengan statistik dataset
 * (di atas/di bawah rata-rata), TANPA klaim penyakit dari satu angka —
 * karena rentang kelas tumpang tindih dan keputusan akhir dibuat model
 * dari gabungan fitur CNN (citra utuh) + GLCM. Bingkai narasi mengikuti
 * vonis agar selalu konsisten dengan kartu Probabilitas.
 *
 * Nilai mentah ditampilkan pada barisnya sendiri (presisi 2–3 desimal),
 * sehingga narasi tidak perlu mengulang angka.
 */
const getGlcmInsights = (
  result: string,
  g?: FeatureAnalysis['glcm']
): FeatureInsight[] => {
  if (!g) return [];
  const isHealthy = result === 'SEHAT';
  const out: FeatureInsight[] = [];

  // Kontras — arah dataset: sehat cenderung LEBIH TINGGI (pola warna aktif)
  const c = g.contrast ?? 0;
  out.push({
    label: 'Kontras',
    value: c.toFixed(2),
    color: '#A78BFA',
    text: isHealthy
      ? c >= DATASET_MID.contrast
        ? `Di atas titik tengah dataset (${DATASET_MID.contrast}) — sesuai karakter citra sehat yang pola warnanya aktif/beragam.`
        : `Di bawah titik tengah dataset (${DATASET_MID.contrast}); sebaran antar ikan sehat memang lebar (±45–137), sehingga nilai ini tidak menyimpang dari pola sehat menurut model.`
      : c < DATASET_MID.contrast
        ? `Di bawah titik tengah dataset (${DATASET_MID.contrast}); tekstur cenderung datar/kurang detail, pola yang lebih sering muncul pada citra tidak sehat.`
        : `Di atas titik tengah dataset (${DATASET_MID.contrast}); bersama keseluruhan citra, model tetap mengarahkan vonis ke kondisi tidak sehat.`,
  });

  // Korelasi — rentang antar kelas nyaris sama (0.94–0.99): hanya konteks
  const co = g.correlation ?? 0;
  out.push({
    label: 'Korelasi',
    value: co.toFixed(3),
    color: '#F472B6',
    text: `Struktur tekstur${co >= 0.95 ? ' konsisten di seluruh citra' : ' mulai tidak seragam'} (rentang dataset 0.94–0.99); nilai ini sendirian tidak membedakan kelas, yang membedakan adalah gabungannya dengan fitur citra.`,
  });

  // Energi & homogenitas — arah dataset: sehat sedikit lebih tinggi
  const e = g.energy ?? 0;
  const h = g.homogeneity ?? 0;
  out.push({
    label: 'Energi',
    value: e.toFixed(3),
    color: '#FBBF24',
    text: `Tingkat keteraturan tekstur (${e >= DATASET_MID.energy ? 'tinggi' : 'sedang'}, titik tengah dataset: ${DATASET_MID.energy}).`,
  });
  out.push({
    label: 'Homogenitas',
    value: h.toFixed(3),
    color: '#34D399',
    text: isHealthy
      ? `${e >= DATASET_MID.energy ? 'Di atas' : 'Di sekitar'} titik tengah dataset (${DATASET_MID.energy} / ${DATASET_MID.homogeneity}), sesuai sebaran tekstur citra sehat.`
      : `${e < DATASET_MID.energy || h < DATASET_MID.homogeneity ? 'Di bawah' : 'Di sekitar'} titik tengah dataset (${DATASET_MID.energy} / ${DATASET_MID.homogeneity}), kompatibel dengan citra tidak sehat pada dataset.`,
  });

  return out;
};

const getRgbInsights = (
  result: string,
  rgb?: FeatureAnalysis['rgb_averages']
): FeatureInsight[] => {
  if (!rgb || rgb.r === undefined || rgb.g === undefined || rgb.b === undefined) return [];
  const isHealthy = result === 'SEHAT';
  const { r, g: gg, b } = rgb;
  const dominant =
    r >= gg && r >= b ? 'Merah' : gg >= r && gg >= b ? 'Hijau' : 'Biru';

  return [
    {
      label: 'Rata-rata Nilai RGB',
      value: `R: ${r.toFixed(1)} | G: ${gg.toFixed(1)} | B: ${b.toFixed(1)}`,
      color: '#EF4444',
      text: isHealthy
        ? `Dominasi kanal warna ${dominant}, selaras dengan karakteristik pigmen alami ikan cupang pada dataset sehat.`
        : `Dominasi kanal warna ${dominant}; bersama fitur tekstur GLCM, kombinasi spektrum ini diarahkan model ke kondisi tidak sehat.`,
    },
    {
      label: 'Kanal Warna Dominan',
      value: `Kanal ${dominant}`,
      color: dominant === 'Merah' ? '#EF4444' : dominant === 'Hijau' ? '#22C55E' : '#3B82F6',
      text: `Menunjukkan komponen intensitas warna utama pada area tubuh ikan yang dipindai.`,
    },
  ];
};

const interpretFeatures = (
  result: string,
  features: FeatureAnalysis
): FeatureInsight[] => {
  return [
    ...getGlcmInsights(result, features.glcm),
    ...getRgbInsights(result, features.rgb_averages),
  ];
};

/** Rekomendasi tindakan saat TIDAK SEHAT (praktik umum perawatan cupang). */
const UNHEALTHY_ACTIONS = [
  'Karantina ikan di wadah terpisah agar tidak menularkan.',
  'Ganti 30–50% air akuarium dan periksa suhu (26–28 °C).',
  'Periksa sirip & tubuh: busuk sirip biasanya ditandai sirip robek/memendek; jamur dengan kapas putih.',
  'Konsultasikan pengobatan (garam akuarium/obat antijamur) bila gejala memburuk.',
];

/* ──────────────────────────────────────────────────────────────────────
 * 1. Peringatan domain shift — dirender TERPISAH oleh layar, tepat
 *    setelah foto utama & sebelum badge Hasil Klasifikasi, agar membingkai
 *    seluruh hasil di bawahnya dan tidak terlewat.
 * ──────────────────────────────────────────────────────────────────── */
export function OodWarningCard({
  ood,
  cardBg,
  textColor,
  textMuted,
}: {
  ood?: OodInfo;
  cardBg: string;
  textColor: string;
  textMuted: string;
}) {
  if (!ood || typeof ood.similarity !== 'number' || ood.similarity >= OOD_WARN_THRESHOLD) {
    return null;
  }
  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: '#F59E0B', borderWidth: 1.5 }]}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="alert-outline" size={22} color="#F59E0B" />
        <Text style={[styles.title, { color: textColor }]}>Foto Kurang Lazim</Text>
      </View>
      <Text style={[styles.metaText, { color: textMuted }]}>
        Kemiripan foto dengan kondisi pelatihan model berada di batas bawah
        (skor {ood.similarity?.toFixed(3)} &lt; ambang {ood.threshold?.toFixed(2)}),
        misalnya gaya foto studio/jurnalistik, latar terang, atau ikan terlalu kecil
        di frame. Hasil analisis berikut sebaiknya tidak dijadikan acuan utama —
        gunakan foto kondisi akuarium seperti pada panduan pengambilan gambar
        untuk hasil paling dapat diandalkan.
      </Text>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * 3. Lampiran teknis: Verifikasi Objek (OOD) + Info Analisis digabung
 *    dalam satu kartu di bagian paling bawah (di atas tombol aksi).
 * ──────────────────────────────────────────────────────────────────── */
export function TechnicalDetailsCard({
  ood,
  meta,
  cardBg,
  cardBorder,
  textColor,
  textMuted,
  primary,
}: {
  ood?: OodInfo;
  meta?: ScanMeta;
  cardBg: string;
  cardBorder: string;
  textColor: string;
  textMuted: string;
  primary: string;
}) {
  if (!ood && !meta) return null;
  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="information-outline" size={22} color={primary} />
        <Text style={[styles.title, { color: textColor }]}>Detail Teknis</Text>
      </View>

      {ood && (
        <>
          <Text style={[styles.subLabel, { color: textMuted }]}>Verifikasi Objek</Text>
          <Text style={[styles.metaText, { color: textMuted }]}>
            Kemiripan embedding vs dataset ikan: {ood.similarity?.toFixed(3)} (ambang {ood.threshold?.toFixed(2)}){' — '}
            {ood.passed ? 'lolos verifikasi.' : 'tidak lolos.'}
            {' '}Hewan terdeteksi: {ood.animal_detected ? 'ya' : 'tidak'}.
          </Text>
        </>
      )}

      {ood && meta && <View style={[styles.divider, { backgroundColor: cardBorder }]} />}

      {meta && (
        <>
          <Text style={[styles.subLabel, { color: textMuted }]}>Info Analisis</Text>
          {meta.model && (
            <Text style={[styles.metaText, { color: textMuted }]}>Model: {meta.model}</Text>
          )}
          {meta.features && (
            <Text style={[styles.metaText, { color: textMuted }]}>Fitur: {meta.features}</Text>
          )}
          {meta.latency_ms !== undefined && (
            <Text style={[styles.metaText, { color: textMuted }]}>Waktu analisis server: {meta.latency_ms} ms</Text>
          )}
          {meta.analyzed_at && (
            <Text style={[styles.metaText, { color: textMuted }]}>
              Dianalisis: {new Date(meta.analyzed_at).toLocaleString('id-ID')}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * 2. Kartu utama wawasan: Probabilitas → Rekomendasi → Fitur & Interpretasi
 *    (+ Detail Teknis bila includeTechnical, default true).
 * ──────────────────────────────────────────────────────────────────── */

interface Props extends InsightTone {
  result: string;
  probabilities?: ClassProbabilities;
  features?: FeatureAnalysis | null;
  ood?: OodInfo;
  meta?: ScanMeta;
  onGoToDiseases?: () => void;
  /** Render kartu Detail Teknis di dalam komponen ini. Matikan (false)
   * bila layar ingin menempatkan TechnicalDetailsCard secara manual. */
  includeTechnical?: boolean;
}

export default function AnalysisInsights({
  result,
  probabilities,
  features,
  ood,
  meta,
  cardBg,
  cardBorder,
  textColor,
  textMuted,
  primary,
  danger,
  onGoToDiseases,
  includeTechnical = true,
}: Props) {
  const isHealthy = result === 'SEHAT';
  const isUnknown = result === 'BUKAN IKAN CUPANG';
  const isSick = !isHealthy && !isUnknown;
  const hasAny =
    probabilities ||
    (features?.glcm && !isUnknown) ||
    (isSick && onGoToDiseases) ||
    (includeTechnical && (ood || meta));
  if (!hasAny) return null;

  return (
    <>
      {/* ── Probabilitas per kelas ── */}
      {probabilities && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="chart-bar" size={22} color={primary} />
            <Text style={[styles.title, { color: textColor }]}>Probabilitas per Kelas</Text>
          </View>
          <StatBar
            label="SEHAT"
            pct={probabilities.SEHAT ?? 0}
            color={primary}
            track={cardBorder}
            text={textColor}
          />
          <StatBar
            label="TIDAK SEHAT"
            pct={probabilities['TIDAK SEHAT'] ?? 0}
            color={danger}
            track={cardBorder}
            text={textColor}
          />
        </View>
      )}

      {/* ── Rekomendasi tindakan (TIDAK SEHAT) ── */}
      {isSick && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="clipboard-list-outline" size={22} color={danger} />
            <Text style={[styles.title, { color: textColor }]}>Rekomendasi Tindakan</Text>
          </View>
          {UNHEALTHY_ACTIONS.map((line, i) => (
            <View key={i} style={styles.bulletRow}>
              <MaterialCommunityIcons name="check-circle-outline" size={14} color={danger} style={styles.bulletIcon} />
              <Text style={[styles.bulletText, { color: textMuted }]}>{line}</Text>
            </View>
          ))}
          {onGoToDiseases && (
            <Pressable onPress={onGoToDiseases} style={{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center' }} hitSlop={8}>
              <Text style={[styles.linkText, { color: primary }]}>Buka Ensiklopedia Penyakit</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color={primary} />
            </Pressable>
          )}
        </View>
      )}

      {/* ── Fitur & Interpretasi (Terpisah: Tekstur GLCM & Intensitas RGB) ── */}
      {features?.glcm && !isUnknown && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="text-box-search-outline" size={22} color={primary} />
            <Text style={[styles.title, { color: textColor }]}>Fitur & Interpretasi</Text>
          </View>

          {/* Subbagian 1: Fitur Tekstur (GLCM) */}
          <View style={styles.subSectionHeader}>
            <View style={[styles.subSectionBadge, { backgroundColor: 'rgba(167, 139, 250, 0.15)' }]}>
              <MaterialCommunityIcons name="texture" size={16} color="#8B5CF6" />
              <Text style={[styles.subSectionBadgeText, { color: '#8B5CF6' }]}>Tekstur GLCM</Text>
            </View>
            <Text style={[styles.subSectionDesc, { color: textMuted }]}>
              Analisis matriks derajat keabuan (kontras, keteraturan, dan homogenitas permukaan sisik)
            </Text>
          </View>

          {getGlcmInsights(result, features.glcm).map((item, i) => (
            <View key={`glcm-${i}`} style={styles.insightBlock}>
              <View style={styles.statRow}>
                <View style={[styles.statDot, { backgroundColor: item.color }]} />
                <Text style={[styles.statLabel, { color: textColor }]}>{item.label}</Text>
                <Text style={[styles.statValue, { color: textColor }]}>{item.value}</Text>
              </View>
              {item.text && (
                <View style={styles.bulletRow}>
                  <MaterialCommunityIcons name="chevron-right" size={14} color={textMuted} style={styles.bulletIcon} />
                  <Text style={[styles.bulletText, { color: textMuted }]}>{item.text}</Text>
                </View>
              )}
            </View>
          ))}

          {/* Subbagian 2: Fitur Warna (RGB) */}
          {features.rgb_averages && features.rgb_averages.r !== undefined && (
            <>
              <View style={[styles.divider, { backgroundColor: cardBorder }]} />
              <View style={styles.subSectionHeader}>
                <View style={[styles.subSectionBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <MaterialCommunityIcons name="palette-outline" size={16} color="#EF4444" />
                  <Text style={[styles.subSectionBadgeText, { color: '#EF4444' }]}>Intensitas Warna RGB</Text>
                </View>
                <Text style={[styles.subSectionDesc, { color: textMuted }]}>
                  Rerata distribusi nilai warna kanal Red, Green, dan Blue pada area tubuh ikan
                </Text>
              </View>

              {getRgbInsights(result, features.rgb_averages).map((item, i) => (
                <View key={`rgb-${i}`} style={styles.insightBlock}>
                  <View style={styles.statRow}>
                    <View style={[styles.statDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.statLabel, { color: textColor }]}>{item.label}</Text>
                    <Text style={[styles.statValue, { color: textColor }]}>{item.value}</Text>
                  </View>
                  {item.text && (
                    <View style={styles.bulletRow}>
                      <MaterialCommunityIcons name="chevron-right" size={14} color={textMuted} style={styles.bulletIcon} />
                      <Text style={[styles.bulletText, { color: textMuted }]}>{item.text}</Text>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}

          <View style={[styles.divider, { backgroundColor: cardBorder }]} />
          <Text style={[styles.noteText, { color: textMuted }]}>
            Catatan: Nilai dibandingkan dengan titik tengah statistik dataset
            (n=30 sampel). Rentang antar kelas saling tumpang tindih, sehingga
            klasifikasi akhir tetap ditentukan model dari gabungan seluruh fitur
            citra MobileNetV2 + GLCM & RGB — bukan dari satu nilai saja.
          </Text>
        </View>
      )}

      {/* ── Lampiran teknis (OOD + metadata) ── */}
      {includeTechnical && (
        <TechnicalDetailsCard
          ood={ood}
          meta={meta}
          cardBg={cardBg}
          cardBorder={cardBorder}
          textColor={textColor}
          textMuted={textMuted}
          primary={primary}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
  subLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  probRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  probLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    width: 90,
  },
  probTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  probFill: {
    height: '100%',
    borderRadius: 5,
  },
  probValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    width: 52,
    textAlign: 'right',
  },
  insightBlock: {
    marginBottom: 10,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  statLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    flex: 1,
  },
  statValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletIcon: {
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginLeft: 6,
  },
  metaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  linkText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    marginRight: 4,
  },
  noteText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
    fontStyle: 'italic',
    marginTop: 6,
    opacity: 0.8,
  },
  divider: {
    width: '100%',
    height: 1,
    marginVertical: 12,
  },
  subSectionHeader: {
    marginTop: 8,
    marginBottom: 10,
  },
  subSectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
    gap: 6,
  },
  subSectionBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  subSectionDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
});
