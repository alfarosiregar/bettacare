import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { getLastCapture } from '../utils/capture-store';
import { useDatabase } from '../context/DatabaseContext';
import { formatHistoryDate } from '../utils/dateUtils';
import FeatureVisualizations from '../components/FeatureVisualizations';
import AnalysisInsights, {
  OodWarningCard,
  TechnicalDetailsCard,
} from '../components/AnalysisInsights';
import ImageViewerModal from '../components/ImageViewerModal';
import ImageModalHeader from '../components/ImageModalHeader';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

/* Base URL API: EXPO_PUBLIC_API_URL boleh berupa base (http://host:8000)
 * atau endpoint lengkap (.../predict). Kita normalkan ke base. */
const RAW_API_URL = process.env.EXPO_PUBLIC_API_URL || '';
const API_BASE = (() => {
  if (RAW_API_URL) {
    const trimmed = RAW_API_URL.replace(/\/+$/, '');
    return trimmed.endsWith('/predict') ? trimmed.slice(0, -'/predict'.length) : trimmed;
  }
  // Fallback default ke server VPS Biznet Gio yang selalu aktif
  return 'http://103.89.0.244';
})();
const PREDICT_URL = `${API_BASE}/predict`;
const ANALYZE_URL = `${API_BASE}/analyze_features`;

/* ───────── Custom pulsing fish spinner ───────── */
const FishSpinner = () => {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    rotate.value = withRepeat(
      withSequence(
        withTiming(10, { duration: 400 }),
        withTiming(-10, { duration: 400 }),
        withTiming(0, { duration: 400 }),
      ),
      -1,
      false,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.spinnerContainer, style]}>
      <Text style={styles.spinnerEmoji}>🐠</Text>
    </Animated.View>
  );
};

/* ───────── Fade-in wrapper ───────── */
const FadeIn = ({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: any;
}) => {
  const opacity = useSharedValue(0);
  const offsetY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
    offsetY.value = withDelay(delay, withTiming(0, { duration: 600 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offsetY.value }],
  }));

  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
};

const LOADING_MESSAGES = [
  { title: "Menganalisis Ikan Cupang...", subtitle: "Mengekstraksi fitur warna RGB..." },
  { title: "Memindai Pola Tekstur...", subtitle: "Menghitung matriks GLCM..." },
  { title: "Mengidentifikasi Kondisi...", subtitle: "Mencocokkan dengan dataset penyakit..." },
  { title: "Menyusun Analisis AI...", subtitle: "Meminta saran perawatan dari pakar..." }
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Mime type sederhana dari ekstensi file (untuk upload multipart & Storage). */
function getMimeType(uri: string): { name: string; type: string } {
  const filename = uri.split('/').pop() || 'photo.jpg';
  const ext = (/\.(\w+)$/.exec(filename)?.[1] || 'jpg').toLowerCase();
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
    dng: 'image/x-adobe-dng',
  };
  return { name: filename, type: map[ext] || 'image/jpeg' };
}

/** Encoder base64 dari Uint8Array (btoa tidak tersedia di runtime RN;
 * FileReader+blob memicu jalur Blob RN yang lambat + peringatan expo-blob). */
function uint8ToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  let i = 0;
  const len = bytes.length;
  while (i + 2 < len) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] + chars[(n >> 6) & 63] + chars[n & 63];
    i += 3;
  }
  const rem = len - i;
  if (rem === 1) {
    const n = bytes[i] << 16;
    out += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] + '==';
  } else if (rem === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] + chars[(n >> 6) & 63] + '=';
  }
  return out;
}

/** Baca file lokal (file://) via JS fetch → base64 murni.
 * Dipakai karena pembacaan NATIVE pada uploadAsync gagal membaca file
 * kamera di Android/Expo Go ("Location ... isn't readable"), sedangkan
 * pembacaan lewat JS fetch terbukti bekerja untuk file yang sama
 * (dipakai persistImage dan <Image>).
 * CATATAN: sengaja memakai arrayBuffer() BUKAN blob()/FileReader — jalur
 * Blob RN menyalin data ke native blob store lalu baca balik base64
 * (lambat + warning "Add the expo-blob package"). */
async function readLocalImageAsBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`Gagal membaca file (HTTP ${response.status})`);
  const buffer = await response.arrayBuffer();
  return uint8ToBase64(new Uint8Array(buffer));
}

export default function ResultScreen() {
  const { uri } = useLocalSearchParams();
  const router = useRouter();
  const [result, setResult] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  /* URI gambar yang DITAMPILKAN di layar hasil. File cache kamera sering
   * tidak bisa dimuat loader gambar native di Android/Expo Go ("Loading
   * bitmap failed") meski JS bisa membacanya — makanya analisis berhasil
   * tapi foto tidak tampil. Diisi dengan salinan file cache buatan
   * expo-file-system (terbaca normal oleh modul native) dari base64 yang
   * sama dengan yang dikirim ke backend. */
  const [displayUri, setDisplayUri] = useState<string | null>(null);
  /* Zoom visualisasi ekstraksi fitur (ImageViewing). */
  const [zoomUri, setZoomUri] = useState<string | null>(null);

  const { colorScheme, colors } = useTheme();
  const { addHistory } = useDatabase();

  /* Guard: proses upload hanya dijalankan sekali per uri
   * (React StrictMode / re-render bisa memicu useEffect dua kali). */
  const startedForUri = useRef<string | null>(null);

  useEffect(() => {
    if (uri && startedForUri.current !== uri) {
      startedForUri.current = uri as string;
      uploadImage(uri as string);
    }
  }, [uri]);

  const fetchGroqAnalysis = async (features: any, classification: string) => {
    try {
      setAiLoading(true);

      const response = await axios.post(
        ANALYZE_URL,
        {
          classification: classification,
          features: features,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Connection: 'close',
          },
          timeout: 30000,
        }
      );

      if (response.data.error) {
        setAiAnalysis(response.data.error);
        return response.data.error;
      } else {
        setAiAnalysis(response.data.analysis);
        return response.data.analysis;
      }
    } catch (error: any) {
      console.error("Backend AI Error:", error?.response?.status, error?.message);
      const errText =
        error?.response?.status === 429
          ? "Layanan analisis AI sedang sibuk. Coba lagi nanti."
          : "Gagal mendapatkan analisis AI dari server. Pastikan backend berjalan dan memiliki koneksi internet.";
      setAiAnalysis(errText);
      return errText;
    } finally {
      setAiLoading(false);
    }
  };

  /**
   * Optimasi gambar sebelum dikirim ke backend AI:
   * Mengompres & mengubah ukuran gambar ke resolusi ideal (lebar 1024px, JPEG q0.8).
   * Menurunkan payload dari ~10 MB menjadi ~120-180 KB (pengurangan 98%).
   * Mencegah "Network Error" pada Axios akibat buffer memori bridge React Native,
   * dan mencegah "Request timeout (ECONNABORTED)" pada koneksi internet seluler.
   */
  const optimizeImageForAnalysis = async (
    rawUri: string,
    initialB64?: string
  ): Promise<{ uri: string; base64: string }> => {
    let sourceUri = rawUri;
    let tempSourceCreated = false;

    // Jika ada initialB64 dari capture kamera, tulis ke file cache buatan sendiri
    // agar expo-image-manipulator dijamin 100% bisa membacanya di semua tipe Android
    if (initialB64) {
      try {
        const tmpPath = `${FileSystem.cacheDirectory}opt_src_${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(tmpPath, initialB64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        sourceUri = tmpPath;
        tempSourceCreated = true;
      } catch (writeErr) {
        console.warn('[DEBUG] Gagal menulis temp source file:', writeErr);
        sourceUri = rawUri;
      }
    }

    try {
      // Resize gambar ke lebar ideal (1024px) dan kualitas JPEG 0.8
      const manipulated = await manipulateAsync(
        sourceUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: SaveFormat.JPEG, base64: true }
      );

      if (manipulated.base64) {
        return {
          uri: manipulated.uri,
          base64: manipulated.base64,
        };
      }
    } catch (manipErr) {
      console.warn('[DEBUG] manipulateAsync gagal, memakai gambar fallback:', manipErr);
    } finally {
      if (tempSourceCreated) {
        FileSystem.deleteAsync(sourceUri, { idempotent: true }).catch(() => {});
      }
    }

    // Fallback jika kompresi gagal
    let fallbackB64 = initialB64;
    if (!fallbackB64 && rawUri.startsWith('file://')) {
      try {
        fallbackB64 = await readLocalImageAsBase64(rawUri);
      } catch (_) {}
    }

    return {
      uri: rawUri,
      base64: fallbackB64 || '',
    };
  };

  /** Buat thumbnail base64 untuk riwayat (pengganti Firebase Storage).
   * LATAR: bucket Storage project belum diaktifkan (uploadBytes → storage/unknown,
   * bucket 404), sehingga riwayat memakai URI lokal yang mati saat cache bersih.
   * Solusi: gambar di-resize ke thumbnail lalu disimpan sebagai data URI
   * base64 di Realtime Database — ikut aturan users/$uid yang sudah ada.
   * Return data URI, atau uri lokal bila manipulasi gagal (riwayat tetap tersimpan). */
  const persistImage = async (localUri: string, sourceB64?: string): Promise<string> => {
    // Thumbnail 640px sisi terpanjang, JPEG q0.8 → ±60–120 KB base64 per scan.
    // Sebelumnya 320px/q0.7: tampil tajam di daftar, tapi BLUR saat dibuka
    // lagi di layar detail / di-zoom (di-stretch sampai lebar layar penuh).
    // 640px masih aman untuk RTDB (per-scan jauh di bawah batas tulis).
    const THUMB_SIZE = 640;
    const THUMB_QUALITY = 0.8;
    try {
      let sourceUri = localUri;
      // File kamera hasil takePictureAsync TIDAK bisa dibaca modul native lain
      // di Android/Expo Go (renderAsync → "Loading bitmap failed"), meski JS
      // bisa membacanya. Solusi: tulis ulang base64 (yang sudah ada di memori
      // dari jalur prediksi) ke file cache buatan sendiri — file buatan
      // expo-file-system terbaca normal oleh modul native.
      if (sourceB64) {
        const tmpPath = `${FileSystem.cacheDirectory}thumb_src_${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(tmpPath, sourceB64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        sourceUri = tmpPath;
      }
      try {
        // Resize berdasarkan LEBAR saja — rasio aspek foto kamera (4:3/16:9)
        // terjaga. Resize width+height sekaligus memaksa persegi dan
        // mendistorsi foto non-persegi.
        const manipulated = await manipulateAsync(
          sourceUri,
          [{ resize: { width: THUMB_SIZE } }],
          { compress: THUMB_QUALITY, format: SaveFormat.JPEG, base64: true },
        );
        if (!manipulated.base64) throw new Error('Thumbnail base64 tidak tersedia');
        return `data:image/jpeg;base64,${manipulated.base64}`;
      } finally {
        // Bersihkan file sumber sementara (hanya yang kita buat sendiri).
        if (sourceUri !== localUri) {
          FileSystem.deleteAsync(sourceUri, { idempotent: true }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Gagal membuat thumbnail riwayat, memakai URI lokal:", e);
    }
    // JANGAN fallback ke file:// lokal: URI cache kamera mati saat cache app
    // dibersihkan / app di-reinstall, sehingga riwayat lama tampil tanpa gambar.
    // Lebih aman tanpa gambar (resolver akan memakai placeholder) daripada
    // menyimpan path yang pasti mati.
    return '';
  };

  /** Pesan ramah pengguna untuk error HTTP dari backend. */
  const friendlyHttpError = (status: number, detail?: string): string => {
    switch (status) {
      case 413:
        return `Ukuran foto terlalu besar. Maksimal 10 MB.`;
      case 415:
        return "Format file tidak didukung. Gunakan JPG, PNG, WEBP, HEIC, atau DNG.";
      case 429:
        return "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.";
      case 503:
        return detail || "Server model sedang tidak tersedia. Coba lagi nanti.";
      case 502:
        return "Layanan analisis AI gagal di server. Coba lagi nanti.";
      default:
        return detail || `Terjadi kesalahan di server (HTTP ${status}).`;
    }
  };

  const uploadImage = async (imageUri: string) => {
    let data: any = null;
    try {
      setLoadingIndex(0);

      const { name, type } = getMimeType(imageUri);

      console.log('[DEBUG] PREDICT_URL:', PREDICT_URL);
      console.log('[DEBUG] imageUri:', imageUri);
      console.log('[DEBUG] file — name:', name, 'type:', type);

      // ── Optimasi Gambar Sebelum Prediksi ──────────────────────────────
      // Masalah: Foto kamera modern (12-48MP) berukuran 5-10MB (base64 ~10MB).
      // Mengirim payload JSON sebesar itu memicu "Network Error" pada Axios bridge
      // di React Native, dan multipart upload timeout di koneksi seluler.
      // Solusi: Resize ke lebar 1024px, JPEG q0.8 → payload turun drastis menjadi ~150KB.
      const capture = getLastCapture();
      let initialB64: string | undefined =
        capture?.base64 && capture?.uri === imageUri ? capture.base64 : undefined;
      if (!initialB64 && imageUri.startsWith('file://')) {
        try {
          initialB64 = await readLocalImageAsBase64(imageUri);
        } catch (_) {}
      }

      console.log('[DEBUG] Mengoptimasi gambar untuk prediksi (resize ke 1024px)...');
      const optimized = await optimizeImageForAnalysis(imageUri, initialB64);
      const targetUri = optimized.uri;
      const targetB64 = optimized.base64;

      // Segera tampilkan gambar hasil optimasi di UI agar tajam dan tidak blank
      setDisplayUri(targetUri);

      const withTimeout = async <T,>(p: Promise<T>): Promise<T> => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            const err: any = new Error('Waktu permintaan habis (timeout). Koneksi internet lambat atau server sedang sibuk.');
            err.code = 'ECONNABORTED';
            reject(err);
          }, 60000);
        });
        try {
          return await Promise.race([p, timeoutPromise]);
        } finally {
          if (timer) clearTimeout(timer);
        }
      };

      const runPredictBase64 = (b64: string, timeoutMs: number = 20000) =>
        axios
          .post(
            `${API_BASE}/predict_base64`,
            { image: b64, mime_type: 'image/jpeg', filename: name || 'scan.jpg' },
            {
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Connection: 'close',
              },
              timeout: timeoutMs,
            }
          )
          .then((res) => ({ status: res.status as number, data: res.data }));

      const runPredictMultipart = async (uploadPath: string): Promise<{ status: number; data: any }> => {
        // Normalisasi double-encoding URI di Expo Go Android (%2540 -> %40)
        let normalizedPath = uploadPath;
        if (normalizedPath.includes('%25')) {
          normalizedPath = normalizedPath.replace(/%25/g, '%');
        }
        console.log('[DEBUG] Memulai uploadAsync file:', normalizedPath);
        const res: any = await FileSystem.uploadAsync(PREDICT_URL, normalizedPath, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          mimeType: 'image/jpeg',
        });
        console.log('[DEBUG] uploadAsync selesai — status:', res.status, 'body:', res.body?.slice(0, 300));
        let json: any;
        try { json = JSON.parse(res.body); } catch { json = { error: res.body }; }
        return { status: res.status as number, data: json };
      };

      const executePrediction = async (): Promise<{ status: number; data: any }> => {
        if (targetB64) {
          const maxRetries = 2; // Total 3x percobaan (1 awal + 2 retry) untuk toleransi fluktuasi jaringan/packet loss
          let lastErr: any = null;

          for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
            try {
              console.log(
                `[DEBUG] /predict_base64 attempt ${attempt}/${maxRetries + 1} (payload: ${Math.round(targetB64.length / 1024)} KB)`
              );
              return await runPredictBase64(targetB64, 20000);
            } catch (err: any) {
              lastErr = err;
              console.warn(`[DEBUG] attempt ${attempt} gagal:`, err?.message || err?.code);
              // Jika ini bukan percobaan terakhir, tunggu sebentar lalu coba lagi
              if (attempt <= maxRetries) {
                await sleep(1000);
              }
            }
          }

          // Jika semua percobaan base64 gagal, coba fallback multipart uploadAsync
          console.warn('[DEBUG] Semua percobaan base64 gagal, mencoba fallback multipart uploadAsync...');
          try {
            return await runPredictMultipart(targetUri);
          } catch (multipartErr) {
            throw lastErr || multipartErr;
          }
        }
        console.log('[DEBUG] transport: multipart uploadAsync (/predict)');
        return await runPredictMultipart(targetUri);
      };

      const requestPromise = withTimeout(executePrediction()).then(({ status, data: json }) => {
        console.log('[DEBUG] predict done — status:', status);
        if (status < 200 || status >= 300) {
          const err: any = new Error(`HTTP ${status}`);
          err.response = { status, data: json };
          throw err;
        }
        return { data: json };
      });

      // Animasi loading berjalan sambil menunggu (delay dipersingkat)
      await sleep(700);
      setLoadingIndex(1);

      await sleep(700);
      setLoadingIndex(2);

      // Tunggu hingga request benar-benar selesai
      const response = await requestPromise;
      data = response.data;
      setResult(data);

      // Backend lama kadang mengembalikan {"error": ...} dengan HTTP 200 — tangani juga.
      if (data?.error) {
        setApiError(data.error);
        return;
      }

      // Pindah ke teks 3 (Analisis AI)
      setLoadingIndex(3);

      let analysisResult = null;
      if (data.extracted_features) {
        // Kirim salinan TANPA visualisasi (data URI besar) ke endpoint AI —
        // model bahasa hanya butuh angka fitur, bukan gambar (hemat payload).
        const { visualizations, ...numericFeatures } = data.extracted_features;
        const groqPromise = fetchGroqAnalysis(numericFeatures, data.result);
        const [groqRes] = await Promise.all([groqPromise, sleep(700)]);
        analysisResult = groqRes;
      }

      // Simpan ke riwayat. Upload Storage dijalankan paralel; kegagalan
      // penyimpanan riwayat TIDAK menggagalkan tampilan hasil prediksi.
      try {
        const now = new Date();
        const isoString = now.toISOString();
        const persistedUri = await persistImage(targetUri, targetB64);
        const historyItem: any = {
          title: 'Hasil Scan Kamera',
          date: formatHistoryDate(isoString),
          createdAt: isoString,
          result: data.result,
          image: persistedUri,
          confidence: Math.round(data.confidence || 0),
          features: data.extracted_features ?? null,
          ai_analysis: analysisResult ?? null,
        };

        // Sertakan field opsional hanya jika nilainya terdefinisi
        if (data.probabilities != null) {
          historyItem.probabilities = data.probabilities;
        }
        if (data.ood != null) {
          historyItem.ood = data.ood;
        }
        if (data.meta != null) {
          historyItem.meta = data.meta;
        }

        await addHistory(historyItem);
      } catch (historyError) {
        // Jangan tampilkan warning jika hasil Bukan Ikan Cupang atau kegagalan non-kritis
        if (data?.result?.toUpperCase() !== 'BUKAN IKAN CUPANG') {
          console.warn("Gagal menyimpan riwayat:", historyError);
        }
      }

    } catch (error: any) {
      console.error('uploadImage error — status:', error?.response?.status, '| message:', error?.message, '| code:', error?.code, '| name:', error?.name);

      let message: string;

      if (error?.response) {
        // Server merespons dengan status error (4xx / 5xx)
        const detail =
          typeof error.response.data?.detail === 'string'
            ? error.response.data.detail
            : undefined;
        message = friendlyHttpError(error.response.status, detail);
      } else if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        // Request timeout
        message =
          'Waktu permintaan habis (timeout). Server mungkin sedang sibuk atau terlalu lambat. Coba lagi beberapa saat.';
      } else if (
        error?.message === 'Network Error' ||
        error?.message === 'Network request failed' ||
        error?.code === 'ERR_NETWORK' ||
        error?.code === 'ECONNREFUSED' ||
        error?.name === 'TypeError'
      ) {
        // Tidak ada koneksi ke backend (server mati, URL salah, atau beda jaringan)
        message =
          `Tidak dapat terhubung ke server (${API_BASE}).\n\nPastikan:\n• Backend sudah berjalan\n• Ponsel & PC berada di WiFi yang sama\n• IP di EXPO_PUBLIC_API_URL masih valid\n• Coba buka di browser HP: ${API_BASE}/health`;
      } else {
        // Error tak terduga lainnya
        message = `Terjadi kesalahan tidak terduga: ${error?.message || 'Unknown error'}`;
      }

      setApiError(message);
    } finally {
      setLoading(false);
    }
  };

  const isHealthy = result?.result === 'SEHAT';
  const isUnknown = result?.result === 'BUKAN IKAN CUPANG';
  const features = result?.extracted_features;

  /* ── Loading state ── */
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <FishSpinner />
        <Text style={[styles.loadingTitle, { color: colors.text, textAlign: 'center' }]}>
          {LOADING_MESSAGES[loadingIndex].title}
        </Text>
        <Text style={[styles.loadingSubtitle, { color: colors.textMuted, textAlign: 'center' }]}>
          {LOADING_MESSAGES[loadingIndex].subtitle}
        </Text>
      </View>
    );
  }

  /* ── Error state (pesan jelas, bukan layar hasil kosong) ── */
  if (apiError) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <MaterialCommunityIcons name="alert-circle" size={64} color={colors.danger} style={{ marginBottom: 16 }} />
        <Text style={[styles.loadingTitle, { color: colors.text, textAlign: 'center' }]}>
          Analisis Gagal
        </Text>
        <Text style={[styles.loadingSubtitle, { color: colors.textMuted, textAlign: 'center' }]}>
          {apiError}
        </Text>
        <Pressable
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="camera-retake" size={20} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.retryButtonText}>Ambil Ulang Foto</Text>
        </Pressable>
      </View>
    );
  }

  /* ── Result state ── */
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* NAVBAR */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Hasil Analisis</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image */}
        <FadeIn delay={0}>
          <Pressable onPress={() => setZoomUri(displayUri || (uri as string))}>
            <Image
              source={displayUri ? { uri: displayUri } : { uri: uri as string }}
              style={[styles.image, { borderColor: colors.border }]}
              resizeMode="cover"
            />
            <View style={[styles.zoomHint, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
              <MaterialCommunityIcons name="magnify" size={20} color="#FFF" />
            </View>
          </Pressable>
        </FadeIn>

        {/* Peringatan domain shift — membingkai seluruh hasil di bawahnya */}
        <OodWarningCard
          ood={result?.ood}
          cardBg={colors.card}
          textColor={colors.text}
          textMuted={colors.textMuted}
        />

        {/* Classification badge */}
        <FadeIn delay={200} style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.resultLabel, { color: colors.textMuted }]}>Hasil Klasifikasi</Text>

          <View
            style={[
              styles.badge,
              { 
                backgroundColor: isUnknown ? (colorScheme === 'dark' ? '#334155' : '#F1F5F9') : (isHealthy ? colors.primaryMuted : colors.dangerMuted),
                borderColor: isUnknown ? colors.border : (isHealthy ? colors.primary : colors.danger) 
              }
            ]}
          >
            <MaterialCommunityIcons
              name={isUnknown ? 'help-circle' : (isHealthy ? 'check-circle' : 'alert-circle')}
              size={28}
              color={isUnknown ? colors.textMuted : (isHealthy ? colors.primary : colors.danger)}
              style={{ marginRight: 10 }}
            />
            <Text
              style={[
                styles.badgeText,
                { color: isUnknown ? colors.text : (isHealthy ? colors.primary : colors.danger) },
              ]}
            >
              {isUnknown ? 'Bukan Ikan Cupang' : (result?.result || 'TIDAK DIKETAHUI')}
            </Text>
          </View>

          {result?.confidence > 0 && (
            <View style={styles.confidenceBar}>
              <View style={[styles.confidenceTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.confidenceFill,
                    {
                      width: `${result.confidence}%`,
                      backgroundColor: isUnknown ? colors.textMuted : (isHealthy ? colors.primary : colors.danger),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.confidenceText, { color: colors.textMuted }]}>
                {result.confidence}% kepercayaan
              </Text>
            </View>
          )}
        </FadeIn>

        {/* Kesimpulan AI — ringkasan bahasa manusia tepat setelah vonis */}
        {features && (
          <FadeIn delay={250} style={[styles.aiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.aiHeader}>
              <MaterialCommunityIcons name="robot-outline" size={24} color={colors.primary} />
              <Text style={[styles.aiTitle, { color: colors.text }]}>Kesimpulan</Text>
            </View>

            {aiLoading ? (
              <View style={styles.aiLoadingContainer}>
                 <Text style={{ color: colors.textMuted }}>Sedang menganalisis fitur dengan AI...</Text>
              </View>
            ) : (
              <Text style={[styles.aiText, { color: colors.text }]}>{aiAnalysis}</Text>
            )}
          </FadeIn>
        )}

        {/* Wawasan analisis: probabilitas per kelas, rekomendasi tindakan,
         * fitur & interpretasi (kartu gabungan). Detail teknis (OOD +
         * metadata) dirender terpisah sebagai lampiran di bawah. */}
        <FadeIn delay={300}>
          <AnalysisInsights
            result={result?.result || ''}
            probabilities={result?.probabilities}
            features={features}
            cardBg={colors.card}
            cardBorder={colors.border}
            textColor={colors.text}
            textMuted={colors.textMuted}
            primary={colors.primary}
            danger={colors.danger}
            onGoToDiseases={isHealthy || isUnknown ? undefined : () => router.push({ pathname: '/disease-detail', params: { id: 1 } })}
            includeTechnical={false}
          />
        </FadeIn>

        {/* Visualisasi proses ekstraksi (RGB + GLCM) — bukti visual utk skripsi */}
        {features?.visualizations && (
          <FadeIn delay={350} style={{ marginBottom: 8 }}>
            <View style={[styles.vizCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <FeatureVisualizations
                visualizations={features.visualizations}
                rgbAverages={features.rgb_averages}
                onZoom={setZoomUri}
              />
            </View>
          </FadeIn>
        )}

        {/* Lampiran teknis: verifikasi objek + metadata proses */}
        <FadeIn delay={450}>
          <TechnicalDetailsCard
            ood={result?.ood}
            meta={result?.meta}
            cardBg={colors.card}
            cardBorder={colors.border}
            textColor={colors.text}
            textMuted={colors.textMuted}
            primary={colors.primary}
          />
        </FadeIn>

        {/* Action buttons */}
        <FadeIn delay={600} style={styles.actions}>
          <Pressable
            style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons
              name="camera-retake"
              size={20}
              color={colors.text}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Ambil Ulang Foto</Text>
          </Pressable>

          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/')}
          >
            <MaterialCommunityIcons
              name="home"
              size={20}
              color="#FFF"
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.primaryButtonText, { color: '#FFF' }]}>Kembali ke Beranda</Text>
          </Pressable>
        </FadeIn>
      </ScrollView>

      <ImageViewerModal
        images={zoomUri ? [{ uri: zoomUri }] : []}
        imageIndex={0}
        visible={!!zoomUri}
        onRequestClose={() => setZoomUri(null)}
        HeaderComponent={() => (
          <ImageModalHeader onRequestClose={() => setZoomUri(null)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  spinnerContainer: {
    marginBottom: 24,
  },
  spinnerEmoji: {
    fontSize: 56,
  },
  loadingTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    marginBottom: 6,
  },
  loadingSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 24,
  },
  retryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#FFF',
    fontSize: 15,
  },

  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 24,
    marginBottom: 24,
    borderWidth: 1,
  },
  resultCard: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  vizCard: {
    width: '100%',
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
  },
  resultLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    marginBottom: 18,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
  },
  confidenceBar: {
    width: '100%',
    alignItems: 'center',
  },
  confidenceTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },

  aiCard: {
    width: '100%',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    marginBottom: 24,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
  aiLoadingContainer: {
    paddingVertical: 12,
  },
  aiText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  primaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  zoomHint: {
    position: 'absolute',
    bottom: 36,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
