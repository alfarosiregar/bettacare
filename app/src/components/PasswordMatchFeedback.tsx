import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  withSequence,
  interpolateColor
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface PasswordMatchFeedbackProps {
  password?: string;
  confirmPassword?: string;
}

export default function PasswordMatchFeedback({ password = '', confirmPassword = '' }: PasswordMatchFeedbackProps) {
  const isMatch = password === confirmPassword;
  const showFeedback = confirmPassword.length > 0;

  // Nilai animasi
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-10);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (showFeedback) {
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withSpring(0, { damping: 12, stiffness: 90 });
      
      // Animasi shake jika tidak cocok
      if (!isMatch) {
        shake.value = withSequence(
          withTiming(10, { duration: 50 }),
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(0, { duration: 50 })
        );
      } else {
        shake.value = withTiming(0);
      }
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(-10, { duration: 200 });
    }
  }, [showFeedback, isMatch]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { translateX: shake.value }
      ],
    };
  });

  if (!showFeedback) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <MaterialCommunityIcons 
        name={isMatch ? "check-circle" : "alert-circle"} 
        size={16} 
        color={isMatch ? "#10B981" : "#EF4444"} 
        style={styles.icon}
      />
      <Text style={[styles.text, { color: isMatch ? "#10B981" : "#EF4444" }]}>
        {isMatch ? "Kata sandi cocok" : "Kata sandi tidak cocok"}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -16,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  }
});
