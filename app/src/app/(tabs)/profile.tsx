import React, { useState } from 'react';
import ImageViewing from 'react-native-image-viewing';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Modal } from 'react-native';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FadeInView from '../../components/FadeInView';
import ImageModalHeader from '../../components/ImageModalHeader';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  const { user, logout, updateThemePreference } = useAuth();
  const { colors, colorScheme, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { aquarium } = useDatabase();

  const [logoutPopupVisible, setLogoutPopupVisible] = useState(false);
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);

  const handleLogout = () => {
    setLogoutPopupVisible(true);
  };

  const confirmLogout = () => {
    setLogoutPopupVisible(false);
    logout();
    router.replace('/login');
  };

  const handleToggleTheme = () => {
    toggleTheme();
    const newTheme = colorScheme === 'light' ? 'dark' : 'light';
    if (user && updateThemePreference) {
      updateThemePreference(newTheme);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 20 }]}>
      
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Profil Saya</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <FadeInView delay={0}>
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {user?.photoURL ? (
              <>
                <Pressable onPress={() => setIsImageViewVisible(true)}>
                  <Image 
                    source={{ uri: user.photoURL }} 
                    style={styles.avatar} 
                  />
                  <View style={[styles.zoomHint, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <MaterialCommunityIcons name="magnify" size={16} color="#FFF" />
                  </View>
                </Pressable>

                <ImageViewing
                  images={[{ uri: user.photoURL }]}
                  imageIndex={0}
                  visible={isImageViewVisible}
                  onRequestClose={() => setIsImageViewVisible(false)}
                  HeaderComponent={() => (
                    <ImageModalHeader onRequestClose={() => setIsImageViewVisible(false)} />
                  )}
                />
              </>
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primaryMuted }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <Text style={[styles.name, { color: colors.text }]}>{user?.fullname || 'Pengguna'}</Text>
            <Text style={[styles.email, { color: colors.textMuted }]}>@{user?.name || 'username'}</Text>
          </View>
        </FadeInView>

        <FadeInView delay={100}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Pengaturan</Text>
          <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            
            <Pressable onPress={() => router.push('/edit-profile')} style={[styles.menuItem, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
              <View style={[styles.menuIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <MaterialCommunityIcons name="account-edit-outline" size={20} color="#10B981" />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>Edit Profil</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
            </Pressable>

            <Pressable onPress={() => router.push('/add-data')} style={[styles.menuItem, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
              <View style={[styles.menuIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <MaterialCommunityIcons name="plus-box-multiple-outline" size={20} color="#3B82F6" />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>Tambah Data</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
            </Pressable>

            <Pressable onPress={() => router.push('/maintenance-history')} style={[styles.menuItem, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
              <View style={[styles.menuIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <MaterialCommunityIcons name="history" size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>Riwayat Perawatan</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
            </Pressable>

            <View style={[styles.menuItem, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
              <View style={[styles.menuIcon, { backgroundColor: colors.primaryMuted }]}>
                <MaterialCommunityIcons name="theme-light-dark" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>Tema Gelap</Text>
              <Pressable onPress={handleToggleTheme} style={styles.actionBtn}>
                <MaterialCommunityIcons 
                  name={colorScheme === 'dark' ? 'toggle-switch' : 'toggle-switch-off-outline'} 
                  size={32} 
                  color={colorScheme === 'dark' ? colors.primary : colors.textMuted} 
                />
              </Pressable>
            </View>

            <Pressable onPress={() => router.push('/privacy')} style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <MaterialCommunityIcons name="shield-account-outline" size={20} color="#3B82F6" />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>Privasi & Keamanan</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
            </Pressable>
            
          </View>
        </FadeInView>

        <FadeInView delay={200}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Bantuan</Text>
          <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            
            <Pressable onPress={() => router.push('/faq')} style={[styles.menuItem, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
              <View style={[styles.menuIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <MaterialCommunityIcons name="help-circle-outline" size={20} color="#10B981" />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>FAQ</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
            </Pressable>

            <Pressable onPress={() => router.push('/about')} style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <MaterialCommunityIcons name="information-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>Tentang Aplikasi</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
            </Pressable>

          </View>
        </FadeInView>

        <FadeInView delay={300}>
          <Pressable 
            style={[styles.logoutBtn, { borderColor: colors.danger }]}
            onPress={handleLogout}
          >
            <MaterialCommunityIcons name="logout" size={20} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={[styles.logoutText, { color: colors.danger }]}>Keluar</Text>
          </Pressable>
        </FadeInView>

      </ScrollView>

      {/* Logout Confirmation Popup */}
      <Modal
        visible={logoutPopupVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLogoutPopupVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#1E293B' : colors.card }]}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="log-out-outline" size={48} color="#F9423A" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Keluar Akun?</Text>
            <Text style={[styles.modalMessage, { color: colors.textMuted }]}>
              Apakah Anda yakin ingin keluar dari aplikasi?
            </Text>
            <View style={styles.modalActions}>
              <Pressable 
                style={[styles.modalBtn, styles.modalBtnCancel]} 
                onPress={() => setLogoutPopupVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textMuted }]}>Batal</Text>
              </Pressable>
              <Pressable 
                onPress={confirmLogout} 
                style={[styles.modalBtn, { backgroundColor: '#F9423A', flex: 1, marginLeft: 8 }]}
              >
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Keluar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  zoomHint: {
    position: 'absolute',
    bottom: 16,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
  },
  name: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    marginBottom: 4,
  },
  email: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  inputField: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    marginBottom: 24,
  },
  menuGroup: {
    marginLeft: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 32,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
  actionBtn: {
    padding: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
  },
  logoutText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    marginRight: 8,
  },
  modalBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
    alignItems: 'flex-start'
  },
  inputLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    marginBottom: 8,
  },
  textInput: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  aqPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  }
});
