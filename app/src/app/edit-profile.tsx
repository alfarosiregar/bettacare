import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import FadeInView from '../components/FadeInView';
import CustomPopup from '../components/CustomPopup';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import PasswordMatchFeedback from '../components/PasswordMatchFeedback';
import * as ImagePicker from 'expo-image-picker';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, updateProfile } = useAuth();

  const [firstname, setFirstname] = useState(user?.firstname || '');
  const [lastname, setLastname] = useState(user?.lastname || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupTitle, setPopupTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [photoBase64, setPhotoBase64] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (user) {
      setFirstname(user.firstname || '');
      setLastname(user.lastname || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!firstname.trim()) {
      setPopupTitle("Peringatan");
      setPopupMessage("Nama depan tidak boleh kosong.");
      setPopupVisible(true);
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      return; // Hentikan proses, tidak usah tampilkan popup, animasi sudah muncul di bawah input
    }

    try {
      setIsSaving(true);
      await updateProfile(firstname, lastname, newPassword, photoBase64);
      setPopupTitle("Berhasil");
      setPopupMessage("Profil berhasil diperbarui.");
      setPopupVisible(true);
    } catch (error: any) {
      setPopupTitle("Gagal");
      let errorMsg = error.message || "Terjadi kesalahan saat memperbarui profil.";
      if (error.code === 'auth/requires-recent-login') {
        errorMsg = "Demi keamanan, Anda perlu logout dan login kembali untuk mengubah kata sandi.";
      }
      setPopupMessage(errorMsg);
      setPopupVisible(true);
    } finally {
      setIsSaving(false);
    }
  };

  const closePopup = () => {
    setPopupVisible(false);
    if (popupTitle === "Berhasil") {
      router.back();
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      setPopupTitle("Izin Ditolak");
      setPopupMessage("Anda harus mengizinkan akses ke galeri untuk mengubah foto profil.");
      setPopupVisible(true);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0].base64) {
      setPhotoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.primary }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFF" />
          </Pressable>
        </View>
        <View style={styles.headerContent}>
          <Pressable onPress={pickImage} style={styles.iconWrapper}>
            {(photoBase64 || user?.photoURL) ? (
              <Image 
                source={{ uri: photoBase64 || user?.photoURL }} 
                style={{ width: '100%', height: '100%', borderRadius: 45 }} 
              />
            ) : (
              <MaterialCommunityIcons name="account-edit" size={56} color={colors.primary} />
            )}
            <View style={styles.cameraIconBadge}>
              <MaterialCommunityIcons name="camera" size={16} color="#FFF" />
            </View>
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profil</Text>
        </View>
        <View style={styles.headerDeco} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <FadeInView delay={100} style={styles.formContainer}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Username</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.7 }]}>
            <MaterialCommunityIcons name="account-circle-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.textMuted }]}
              value={user?.username || user?.name || ''}
              editable={false}
            />
          </View>

          <Text style={[styles.inputLabel, { color: colors.text }]}>Nama Depan</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="account-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Masukkan nama depan"
              placeholderTextColor={colors.textMuted}
              value={firstname}
              onChangeText={setFirstname}
            />
          </View>

          <Text style={[styles.inputLabel, { color: colors.text }]}>Nama Belakang (Opsional)</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="account-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Masukkan nama belakang"
              placeholderTextColor={colors.textMuted}
              value={lastname}
              onChangeText={setLastname}
            />
          </View>

          <Text style={[styles.inputLabel, { color: colors.text }]}>Kata Sandi Baru (Opsional)</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Kosongkan jika tidak ingin mengubah"
              placeholderTextColor={colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
              <MaterialCommunityIcons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color={colors.textMuted} 
              />
            </Pressable>
          </View>
          <PasswordStrengthMeter password={newPassword} />

          <Text style={[styles.inputLabel, { color: colors.text }]}>Konfirmasi Kata Sandi Baru</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="lock-check-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Masukkan ulang kata sandi baru"
              placeholderTextColor={colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 4 }}>
              <MaterialCommunityIcons 
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color={colors.textMuted} 
              />
            </Pressable>
          </View>
          
          <PasswordMatchFeedback password={newPassword} confirmPassword={confirmPassword} />

          <Pressable 
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]} 
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>Simpan Perubahan</Text>
            )}
          </Pressable>
        </FadeInView>

      </ScrollView>

      <CustomPopup 
        visible={popupVisible}
        title={popupTitle}
        message={popupMessage}
        onClose={closePopup}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: 'relative',
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backBtn: {
    padding: 8,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 10,
    zIndex: 2,
  },
  iconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#FFF',
    marginBottom: 12,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3B82F6',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  headerDeco: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -50,
    right: -80,
    zIndex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 32,
  },
  formContainer: {
    width: '100%',
  },
  inputLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 24,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    height: '100%',
  },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFF',
  }
});
