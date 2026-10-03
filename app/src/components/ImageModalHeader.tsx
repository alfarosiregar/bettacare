import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ImageModalHeaderProps {
  onRequestClose: () => void;
}

const HIT_SLOP = { top: 16, left: 16, bottom: 16, right: 16 };

export default function ImageModalHeader({ onRequestClose }: ImageModalHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) }]}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onRequestClose}
        hitSlop={HIT_SLOP}
        activeOpacity={0.7}
      >
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'flex-end',
    width: '100%',
  },
  closeButton: {
    marginRight: 16,
    marginTop: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  closeText: {
    lineHeight: 22,
    fontSize: 18,
    textAlign: 'center',
    color: '#FFF',
    includeFontPadding: false,
  },
});
