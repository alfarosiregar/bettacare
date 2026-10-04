import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useDatabase } from '../context/DatabaseContext';
import { resolveImage } from '../utils/imageResolver';
import ImageViewerModal from '../components/ImageViewerModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import ImageModalHeader from '../components/ImageModalHeader';
import FeatureVisualizations from '../components/FeatureVisualizations';
import AnalysisInsights, {
  OodWarningCard,
  TechnicalDetailsCard,
} from '../components/AnalysisInsights';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colorScheme, colors } = useTheme();
  const { history, removeHistory } = useDatabase();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  /* Zoom visualisasi ekstraksi fitur (ImageViewing). Data dari Firebase bisa
   * berisi nilai non-string (scan lama) — saring di render. */
  const [zoomUri, setZoomUri] = useState<string | number | null>(null);
  const insets = useSafeAreaInsets();

  // Find the matching item
  const item = history.find((i: any) => i.id === id);

  if (!item) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Riwayat tidak ditemukan.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary }}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  const isHealthy = item.result === 'SEHAT';
  const isUnknown = item.result === 'BUKAN IKAN CUPANG';
  const imageSource = resolveImage(item.image);
  const features = item.features;

  /* Zoom foto utama riwayat */
  const openMainImageZoom = () => {
    setZoomUri(item.image ?? null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.appBar, { paddingTop: insets.top + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtnHeader} hitSlop={10}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.appBarTitle, { color: colors.text }]}>Detail Analisis</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={openMainImageZoom}>
          <Image source={imageSource} style={[styles.image, { borderColor: colors.border }]} resizeMode="cover" />
          <View style={[styles.zoomHint, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <MaterialCommunityIcons name="magnify" size={20} color="#FFF" />
          </View>
        </Pressable>

        {/* Modal zoom visualisasi & foto utama */}
        <ImageViewerModal
          images={zoomUri ? [{ uri: zoomUri }] : []}
          imageIndex={0}
          visible={!!zoomUri}
          onRequestClose={() => setZoomUri(null)}
          HeaderComponent={() => (
            <ImageModalHeader onRequestClose={() => setZoomUri(null)} />
          )}
        />

        {/* Peringatan domain shift — membingkai seluruh hasil di bawahnya.
         * Kartu wawasan utama dirender SETELAH badge & kesimpulan AI. */}
        <OodWarningCard
          ood={item.ood}
          cardBg={colors.card}
          textColor={colors.text}
          textMuted={colors.textMuted}
        />

        {/* Classification badge */}
        <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.resultLabel, { color: colors.textMuted }]}>Hasil Klasifikasi ({item.date})</Text>

          <View
            style={[
              styles.badge,
              { 
                backgroundColor: isHealthy ? colors.primaryMuted : colors.dangerMuted,
                borderColor: isHealthy ? colors.primary : colors.danger 
              }
            ]}
          >
            <MaterialCommunityIcons
              name={isHealthy ? 'check-circle' : 'alert-circle'}
              size={28}
              color={isHealthy ? colors.primary : colors.danger}
              style={{ marginRight: 10 }}
            />
            <Text
              style={[
                styles.badgeText,
                { color: isHealthy ? colors.primary : colors.danger },
              ]}
            >
              {item.result}
            </Text>
          </View>

          <View style={styles.confidenceBar}>
            <View style={[styles.confidenceTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.confidenceFill,
                  {
                    width: `${item.confidence ?? 0}%`,
                    backgroundColor: isHealthy ? colors.primary : colors.danger,
                  },
                ]}
              />
            </View>
            <Text style={[styles.confidenceText, { color: colors.textMuted }]}>
              {item.confidence ?? 0}% kepercayaan
            </Text>
          </View>
        </View>

        {/* Kesimpulan AI — ringkasan bahasa manusia tepat setelah vonis */}
        {item.ai_analysis && (
          <View style={[styles.aiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.aiHeader}>
              <MaterialCommunityIcons name="robot-outline" size={24} color={colors.primary} />
              <Text style={[styles.aiTitle, { color: colors.text }]}>Kesimpulan</Text>
            </View>
            <Text style={[styles.aiText, { color: colors.text }]}>{item.ai_analysis}</Text>
          </View>
        )}

        {/* Wawasan analisis: probabilitas per kelas, rekomendasi tindakan,
         * fitur & interpretasi (kartu gabungan). Bisa kosong untuk scan lama
         * sebelum fitur ini ada. */}
        <AnalysisInsights
          result={item.result}
          probabilities={item.probabilities}
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

        {/* Visualisasi proses ekstraksi (RGB + GLCM) — hanya bila semua URI
         * berupa string (scan baru dari backend yang sudah mendukung). */}
        {features?.visualizations &&
          typeof features.visualizations.grayscale === 'string' && (
            <View style={[styles.featuresCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <FeatureVisualizations
                visualizations={features.visualizations}
                rgbAverages={features.rgb_averages}
                onZoom={setZoomUri}
              />
            </View>
          )}

        {/* Lampiran teknis: verifikasi objek + metadata proses */}
        <TechnicalDetailsCard
          ood={item.ood}
          meta={item.meta}
          cardBg={colors.card}
          cardBorder={colors.border}
          textColor={colors.text}
          textMuted={colors.textMuted}
          primary={colors.primary}
        />

        <Pressable 
          style={[styles.deleteBtn, { backgroundColor: '#F9423A' }]}
          onPress={() => setShowDeleteModal(true)}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.deleteBtnText}>Hapus Riwayat</Text>
        </Pressable>

      </ScrollView>

      <ConfirmDeleteModal 
        visible={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}          onConfirm={() => {
          removeHistory(item.id);
          setShowDeleteModal(false);
          router.replace('/(tabs)');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  backBtnHeader: {
    padding: 4,
  },
  appBarTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 24,
    marginBottom: 24,
    borderWidth: 1,
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
  resultCard: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
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
  featuresCard: {
    width: '100%',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    marginBottom: 24,
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
  aiText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  deleteBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFF',
  },
});
