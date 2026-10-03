import React, { useEffect } from 'react';
import { View, Text, StyleSheet, type TextStyle, type ViewStyle, type DimensionValue } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolateColor
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

interface PasswordStrengthMeterProps {
  password?: string;
}

export default function PasswordStrengthMeter({ password = '' }: PasswordStrengthMeterProps) {
  const { colors } = useTheme();
  
  // Hitung kekuatan password
  const getStrength = (pass: string) => {
    let score = 0;
    if (!pass) return score;
    
    if (pass.length > 5) score += 1;
    if (pass.length > 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    // Batasi maksimum skor 4
    return Math.min(score, 4);
  };

  const score = getStrength(password);
  
  const getLabel = (s: number) => {
    switch (s) {
      case 0: return '';
      case 1: return 'Lemah';
      case 2: return 'Sedang';
      case 3: return 'Kuat';
      case 4: return 'Sangat Kuat';
      default: return '';
    }
  };

  // Nilai animasi untuk lebar dan warna
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(score, { damping: 15, stiffness: 100 });
  }, [score]);

  const animatedBarStyle = useAnimatedStyle<ViewStyle>(() => {
    const width = `${(progress.value / 4) * 100}%` as DimensionValue;
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1, 2, 3, 4],
      [colors.border, '#EF4444', '#F59E0B', '#3B82F6', '#10B981'] // Default, Merah, Kuning, Biru, Hijau
    );

    return {
      width,
      backgroundColor,
    };
  });

  const animatedTextStyle = useAnimatedStyle<TextStyle>(() => {
    const color = interpolateColor(
      progress.value,
      [0, 1, 2, 3, 4],
      [colors.textMuted, '#EF4444', '#F59E0B', '#3B82F6', '#10B981']
    );

    return {
      color,
    };
  });

  if (!password) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.barBackground, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.barFill, animatedBarStyle]} />
      </View>
      <View style={styles.labelContainer}>
        <Animated.Text style={[styles.label, animatedTextStyle]}>
          {getLabel(score)}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: -8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  barBackground: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  labelContainer: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  }
});
