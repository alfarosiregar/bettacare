import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface CustomPopupProps {
  visible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

export default function CustomPopup({ visible, title = "Pemberitahuan", message, onClose }: CustomPopupProps) {
  const { colors } = useTheme();

  const isSuccess = title.toLowerCase().includes('berhasil') || title.toLowerCase().includes('sukses');
  const iconName = isSuccess ? 'check-circle-outline' : 'alert-circle-outline';
  const iconColor = isSuccess ? '#10B981' : colors.danger; // Green for success, Danger for error
  const iconBgColor = isSuccess ? 'rgba(16, 185, 129, 0.15)' : colors.danger + '20';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.modalIconContainer, { backgroundColor: iconBgColor }]}>
            <MaterialCommunityIcons name={iconName} size={44} color={iconColor} />
          </View>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.modalMessage, { color: colors.textMuted }]}>{message}</Text>
          <Pressable 
            style={[styles.modalBtn, { backgroundColor: colors.primary }]} 
            onPress={onClose}
          >
            <Text style={styles.modalBtnText}>Tutup</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalBtn: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFF',
  }
});
