import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { setLastCapture } from '../utils/capture-store';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  
  const insets = useSafeAreaInsets();
  const { colorScheme, colors } = useTheme();

  /* Scan line animation */
  const scanLineY = useSharedValue(0);

  useEffect(() => {
    scanLineY.value = withRepeat(
      withTiming(246, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  /* ── Web fallback ── */
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webFallback, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <MaterialCommunityIcons
          name="camera-off"
          size={64}
          color={colors.iconDefault}
          style={{ marginBottom: 20 }}
        />
        <Text style={[styles.webFallbackTitle, { color: colors.text }]}>Kamera Tidak Tersedia</Text>
        <Text style={[styles.webFallbackDesc, { color: colors.textMuted }]}>
          Akses kamera hanya tersedia di perangkat Android fisik.{'\n'}
          Silakan pindai kode QR dengan Expo Go di ponsel Anda.
        </Text>
        <Pressable style={[styles.galleryBtnLarge, { backgroundColor: colors.primary }]} onPress={handlePickImage}>
          <MaterialCommunityIcons
            name="image-multiple"
            size={22}
            color="#FFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.galleryBtnText}>Pilih dari Galeri</Text>
        </Pressable>
        <Pressable style={[styles.backBtnOutline, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: colors.textMuted }]}>← Kembali ke Beranda</Text>
        </Pressable>
      </View>
    );
  }

  /* ── Permission states ── */
  if (!permission) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={[styles.permBgLayer, { backgroundColor: colors.card, opacity: colorScheme === 'dark' ? 0.4 : 1 }]} />
        <MaterialCommunityIcons
          name="camera-off"
          size={64}
          color={colors.iconDefault}
          style={{ marginBottom: 20 }}
        />
        <Text style={[styles.permissionTitle, { color: colors.text }]}>Akses Kamera Diperlukan</Text>
        <Text style={[styles.permissionMessage, { color: colors.textMuted }]}>
          Kami membutuhkan izin Anda untuk menganalisis ikan cupang Anda.
        </Text>
        <Pressable style={[styles.permissionButton, { backgroundColor: colors.primary }]} onPress={requestPermission}>
          <Text style={[styles.permissionButtonText, { color: '#FFF' }]}>Izinkan Kamera</Text>
        </Pressable>

        <Pressable style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.back()}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={colors.text}
          />
        </Pressable>
      </View>
    );
  }

  /* ── Handlers ── */
  async function handleTakePicture() {
    if (cameraRef.current) {
      setIsProcessing(true);
      try {
        // base64: true → data gambar dikirim dari memori ke layar Result,
        // bypass bug Android/Expo Go "Location ... isn't readable" saat
        // uploadAsync mencoba membaca file cache kamera secara native.
        // quality 0.8 menjaga payload base64 (+33% overhead) tetap wajar.
        const CAPTURE_QUALITY = 0.8;
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: CAPTURE_QUALITY,
        });
        if (photo) {
          setLastCapture({
            base64: photo.base64,
            uri: photo.uri,
            quality: CAPTURE_QUALITY,
          });
          router.push({ pathname: '/result', params: { uri: photo.uri } });
        }
      } catch (e) {
        console.log(e);
      } finally {
        setIsProcessing(false);
      }
    }
  }

  async function handlePickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      router.push({
        pathname: '/result',
        params: { uri: result.assets[0].uri },
      });
    }
  }

  /* ── Camera UI ── */
  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <CameraView style={styles.camera} ref={cameraRef} facing="back" />

      {/* Header */}
      <View style={[styles.headerArea, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color="#F8FAFC"
          />
        </Pressable>
        <View style={styles.headerPill}>
          <Text style={[styles.headerText, { color: colors.primary }]}>Sejajarkan ikan dalam bingkai</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Scanner overlay */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.guideBox}>
          <View style={[styles.corner, styles.topLeft, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.topRight, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.bottomRight, { borderColor: colors.primary }]} />
          <Animated.View style={[styles.scanLine, scanLineStyle, { backgroundColor: colors.danger, shadowColor: colors.danger }]} />
        </View>
      </View>

      {/* Bottom controls */}
      <View style={styles.controlsBar}>
        <Pressable style={styles.galleryButton} onPress={handlePickImage}>
          <MaterialCommunityIcons
            name="image-multiple"
            size={24}
            color="#F8FAFC"
          />
          <Text style={styles.galleryButtonText}>Galeri</Text>
        </Pressable>

        <Pressable
          style={styles.captureButton}
          onPress={handleTakePicture}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color={colors.danger} size="large" />
          ) : (
            <View style={styles.captureInner} />
          )}
        </Pressable>

        <View style={{ width: 80 }} />
      </View>
    </View>
  );
}

/* ═══════════════════════ STYLES ═══════════════════════ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  /* ── Web fallback ── */
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  webFallbackTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    marginBottom: 8,
  },
  webFallbackDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  galleryBtnLarge: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  galleryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#FFF',
    fontSize: 15,
  },
  backBtnOutline: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  backBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },

  /* ── Permission ── */
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permBgLayer: {
    ...StyleSheet.absoluteFill,
  },
  permissionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    marginBottom: 8,
  },
  permissionMessage: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 28,
  },
  permissionButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  permissionButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
  },

  /* ── Camera ── */
  camera: {
    flex: 1,
  },
  headerArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    zIndex: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  headerPill: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },

  /* ── Overlay ── */
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideBox: {
    width: 250,
    height: 250,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 14,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 14,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 14,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 14,
  },
  scanLine: {
    width: '100%',
    height: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },

  /* ── Controls ── */
  controlsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#F8FAFC',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8FAFC',
  },
  galleryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
  },
  galleryButtonText: {
    color: '#F8FAFC',
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 4,
  },
});
