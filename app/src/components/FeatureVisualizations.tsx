import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { FeatureAnalysis } from '../types/domain';
import { dataUriToTempFile } from '../utils/dataUriToTempFile';

/**
 * Visualisasi proses ekstraksi fitur (RGB + GLCM) untuk kebutuhan skripsi.
 *
 * Gambar berupa data URI JPEG yang dirender backend dari citra 224x224 yang
 * SAMA dengan input model — bukan re-render di sisi klien. Dipakai bersama
 * oleh layar Hasil Analisis (result.tsx) dan Detail Analisis riwayat
 * (history-detail.tsx).
 *
 * Layout: baris 1 = grayscale | heatmap GLCM, baris 2 = kanal R|G|B,
 * baris 3 = histogram RGB full-width. Semua item bisa ditekan untuk zoom.
 */

interface VisualizationsProps {
  visualizations?: NonNullable<FeatureAnalysis['visualizations']>;
  rgbAverages?: FeatureAnalysis['rgb_averages'];
  onZoom?: (uri: string) => void;
}

const VisualizationTile = ({
  uri,
  label,
  value,
  valueColor,
  onZoom,
  aspectRatio = 1,
}: {
  uri: string;
  label: string;
  value?: string;
  valueColor?: string;
  onZoom?: (uri: string) => void;
  aspectRatio?: number;
}) => {
  const [preparing, setPreparing] = useState(false);

  const handlePress = async () => {
    if (!onZoom || preparing) return;
    setPreparing(true);
    try {
      // Data URI GAGAL di-zoom lewat react-native-image-viewing (Image.getSize
      // native tidak bisa memuat data URI di Android/Expo Go → dimensi 0x0).
      // Konversi ke file cache agar loader native bisa membacanya.
      const zoomableUri = await dataUriToTempFile(uri);
      onZoom(zoomableUri);
    } catch {
      // Gagal menulis file → coba saja URI asli (fallback).
      onZoom(uri);
    } finally {
      setPreparing(false);
    }
  };

  return (
    <Pressable onPress={handlePress} disabled={!onZoom}>
      <Image source={{ uri }} style={[styles.tile, { aspectRatio }]} resizeMode="cover" />
      <View style={styles.tileLabelRow}>
        <Text style={styles.tileLabel}>{label}</Text>
        {value !== undefined && (
          <Text style={[styles.tileValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
        )}
      </View>
    </Pressable>
  );
};

export default function FeatureVisualizations({
  visualizations,
  rgbAverages,
  onZoom,
}: VisualizationsProps) {
  if (!visualizations?.grayscale && !visualizations?.glcm_heatmap) return null;

  const channels: { uri?: string; label: string; avg?: number; color: string }[] = [
    { uri: visualizations.channel_r, label: 'Kanal R', avg: rgbAverages?.r, color: '#EF4444' },
    { uri: visualizations.channel_g, label: 'Kanal G', avg: rgbAverages?.g, color: '#22C55E' },
    { uri: visualizations.channel_b, label: 'Kanal B', avg: rgbAverages?.b, color: '#3B82F6' },
  ];

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="image-filter-center-focus" size={22} />
        <Text style={styles.title}>Proses Ekstraksi Fitur</Text>
      </View>
      <Text style={styles.caption}>
        Citra 224×224 piksel yang sama dengan input model. Ketuk gambar untuk memperbesar.
      </Text>

      <View style={styles.row}>
        {visualizations.grayscale && (
          <View style={styles.halfTile}>
            <VisualizationTile
              uri={visualizations.grayscale}
              label="Grayscale (input GLCM)"
              onZoom={onZoom}
            />
          </View>
        )}
        {visualizations.glcm_heatmap && (
          <View style={styles.halfTile}>
            <VisualizationTile
              uri={visualizations.glcm_heatmap}
              label="Matriks GLCM 256² (skala log)"
              onZoom={onZoom}
            />
          </View>
        )}
      </View>

      <View style={styles.row}>
        {channels.map((ch) =>
          ch.uri ? (
            <View key={ch.label} style={styles.thirdTile}>
              <VisualizationTile
                uri={ch.uri}
                label={ch.label}
                value={ch.avg !== undefined ? ch.avg.toFixed(2) : undefined}
                valueColor={ch.color}
                onZoom={onZoom}
              />
            </View>
          ) : null
        )}
      </View>

      {visualizations.histogram_rgb && (
        <VisualizationTile
          uri={visualizations.histogram_rgb}
          label="Histogram RGB (distribusi intensitas 0–255)"
          onZoom={onZoom}
          aspectRatio={2}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
    borderColor: 'rgba(150,150,150,0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(120,120,120,1)',
    marginBottom: 14,
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  halfTile: {
    flex: 1,
    marginHorizontal: 4,
  },
  thirdTile: {
    flex: 1,
    marginHorizontal: 3,
  },
  tile: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  tileLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  tileLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: 'rgba(120,120,120,1)',
    flex: 1,
  },
  tileValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    marginLeft: 4,
  },
});
