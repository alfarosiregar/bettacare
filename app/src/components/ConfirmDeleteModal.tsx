import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Dimensions } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface ConfirmDeleteModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export default function ConfirmDeleteModal({ 
  visible, 
  onCancel, 
  onConfirm,
  title = "Hapus Riwayat",
  message = "Apakah Anda yakin ingin menghapus riwayat analisis ini? Tindakan ini tidak dapat dibatalkan."
}: ConfirmDeleteModalProps) {
  const { colorScheme, colors } = useTheme();

  return (
    <Modal 
      transparent 
      visible={visible} 
      animationType="fade" 
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        
        <View style={[
          styles.card, 
          { backgroundColor: colorScheme === 'dark' ? '#1E293B' : colors.card, borderColor: colors.border }
        ]}>
          {/* Icon Area */}
          <View style={{ marginBottom: 16 }}>
            <Ionicons name="alert-circle" size={64} color="#F9423A" />
          </View>
          
          {/* Text Area */}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
          
          {/* Buttons */}
          <View style={styles.buttonRow}>
            <Pressable 
              style={[styles.btnCancel, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
              onPress={onCancel}
            >
              <Text style={[styles.btnCancelText, { color: colors.text }]}>Batal</Text>
            </Pressable>
            <Pressable 
              style={styles.btnConfirm}
              onPress={onConfirm}
            >
              <Text style={styles.btnConfirmText}>Hapus</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: Math.min(width - 48, 360),
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginRight: 8,
  },
  btnCancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  btnConfirm: {
    flex: 1,
    backgroundColor: '#F9423A',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#F9423A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnConfirmText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FFF',
  },
});
