import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Text,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { getResolvedSource } from '../utils/imageResolver';
import ImageModalHeader from './ImageModalHeader';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageViewerModalProps {
  visible: boolean;
  images?: Array<{ uri?: any } | any>;
  imageUri?: any;
  imageIndex?: number;
  onRequestClose: () => void;
  HeaderComponent?: React.ComponentType<any>;
}

export default function ImageViewerModal({
  visible,
  images,
  imageUri,
  imageIndex = 0,
  onRequestClose,
  HeaderComponent,
}: ImageViewerModalProps) {
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Ambil target gambar dari images[imageIndex] atau fallback ke imageUri
  const targetImage = images && images.length > imageIndex ? images[imageIndex] : imageUri;
  const source = getResolvedSource(targetImage);

  // Animasi Gesture: Scale & Translate
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const resetZoom = () => {
    'worklet';
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  useEffect(() => {
    if (visible) {
      setHasError(false);
      resetZoom();
    }
  }, [visible]);

  // Gesture Pinch (Zoom dengan 2 jari)
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 0.8), 5);
    })
    .onEnd(() => {
      if (scale.value < 1) {
        resetZoom();
      } else {
        savedScale.value = scale.value;
      }
    });

  // Gesture Pan (Geser foto ketika diperbesar / Geser ke bawah untuk menutup)
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1.05) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      } else if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (scale.value <= 1.05 && e.translationY > 100) {
        runOnJS(onRequestClose)();
      } else if (scale.value <= 1.05) {
        translateY.value = withTiming(0);
      } else {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    });

  // Gesture Double Tap (Ketuk 2x untuk zoom 2.5x atau reset)
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.2) {
        resetZoom();
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    });

  const composedGestures = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    doubleTapGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent={true}
    >
      <GestureHandlerRootView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />

        {/* Header (Tombol Tutup) */}
        <View style={styles.headerContainer}>
          {HeaderComponent ? (
            <HeaderComponent onRequestClose={onRequestClose} />
          ) : (
            <ImageModalHeader onRequestClose={onRequestClose} />
          )}
        </View>

        {/* Viewport Foto dengan Gestur Zoom & Pan */}
        <View style={styles.content}>
          {source && !hasError ? (
            <GestureDetector gesture={composedGestures}>
              <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                <Animated.Image
                  source={source}
                  style={styles.image}
                  resizeMode="contain"
                  onLoadStart={() => setLoading(true)}
                  onLoadEnd={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    setHasError(true);
                  }}
                />
              </Animated.View>
            </GestureDetector>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {hasError ? 'Gagal memuat gambar' : 'Gambar tidak tersedia'}
              </Text>
            </View>
          )}

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Petunjuk Penggunaan di Bawah */}
        <View style={styles.footerHint}>
          <Text style={styles.hintText}>Ketuk 2x atau cubit untuk memperbesar • Geser ke bawah untuk menutup</Text>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH * 0.95,
    height: SCREEN_HEIGHT * 0.8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    pointerEvents: 'none',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  footerHint: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 10,
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
