import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Dimensions
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
  withDelay
} from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import FadeInView from '../components/FadeInView';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import PasswordMatchFeedback from '../components/PasswordMatchFeedback';
import { LinearGradient } from 'expo-linear-gradient';
import { isFirebaseConfigured } from '../config/firebase';

const SwimmingFish = ({ onComplete, delay, startY }: { onComplete: () => void, delay: number, startY: number }) => {
  const { width } = Dimensions.get('window');
  const translateX = useSharedValue(-100);
  const translateY = useSharedValue(startY); 
  const rotate = useSharedValue(0);

  useEffect(() => {
    translateX.value = withDelay(delay, withTiming(width + 100, {
      duration: 3500,
      easing: Easing.inOut(Easing.ease)
    }, (finished) => {
      if (finished) {
        runOnJS(onComplete)();
      }
    }));

    translateY.value = withDelay(delay, withSequence(
      withTiming(translateY.value - 60, { duration: 1750, easing: Easing.inOut(Easing.sin) }),
      withTiming(translateY.value + 60, { duration: 1750, easing: Easing.inOut(Easing.sin) })
    ));

    rotate.value = withDelay(delay, withSequence(
      withTiming(-20, { duration: 1750, easing: Easing.inOut(Easing.sin) }),
      withTiming(20, { duration: 1750, easing: Easing.inOut(Easing.sin) })
    ));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` }
    ],
    position: 'absolute',
    zIndex: 9999,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <MaterialCommunityIcons name="fish" size={60} color="#10B981" />
    </Animated.View>
  );
};

export default function LoginScreen() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorPopupVisible, setErrorPopupVisible] = useState(false);
  const [successPopupVisible, setSuccessPopupVisible] = useState(false);
  const [registeredUsername, setRegisteredUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetPopupVisible, setResetPopupVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { login, register, resetPassword } = useAuth();
  const { colors, toggleTheme, colorScheme } = useTheme();

  const [fishes, setFishes] = useState<{ id: number, delay: number, startY: number }[]>([]);

  const spawnFish = () => {
    const now = Date.now();
    setFishes(prev => [
      ...prev,
      { id: now, delay: 0, startY: Math.random() * 200 + 100 },
      { id: now + 1, delay: 200, startY: Math.random() * 200 + 100 },
      { id: now + 2, delay: 400, startY: Math.random() * 200 + 100 }
    ]);
  };

  const removeFish = (id: number) => {
    setFishes(prev => prev.filter(f => f.id !== id));
  };

  const handleSubmit = async () => {
    if (isLoginMode) {
      if (!username.trim()) {
        setErrorMsg("Username atau Email tidak boleh kosong");
        setErrorPopupVisible(true);
        return;
      }
      if (!password) {
        setErrorMsg("Kata sandi tidak boleh kosong");
        setErrorPopupVisible(true);
        return;
      }
    } else {
      if (!firstname.trim()) {
        setErrorMsg("Nama Depan tidak boleh kosong");
        setErrorPopupVisible(true);
        return;
      }
      if (!username.trim()) {
        setErrorMsg("Username tidak boleh kosong");
        setErrorPopupVisible(true);
        return;
      }
      if (!email.trim()) {
        setErrorMsg("Email tidak boleh kosong");
        setErrorPopupVisible(true);
        return;
      }
      if (!email.includes('@') || !email.includes('.')) {
        setErrorMsg("Format email tidak valid (contoh: nama@email.com)");
        setErrorPopupVisible(true);
        return;
      }
      if (!password) {
        setErrorMsg("Kata sandi tidak boleh kosong");
        setErrorPopupVisible(true);
        return;
      }
      if (password.length < 6) {
        setErrorMsg("Kata sandi minimal 6 karakter");
        setErrorPopupVisible(true);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Konfirmasi kata sandi tidak cocok");
        setErrorPopupVisible(true);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      let result;
      if (isLoginMode) {
        result = await login(username.trim().toLowerCase(), password);
        if (result) {
          setErrorMsg(result);
          setErrorPopupVisible(true);
        }
      } else {
        const regUsername = username.trim();
        result = await register(
          firstname.trim(),
          lastname.trim(),
          regUsername,
          email.trim().toLowerCase(),
          password
        );
        if (result) {
          setErrorMsg(result);
          setErrorPopupVisible(true);
        } else {
          setRegisteredUsername(regUsername);
          setSuccessPopupVisible(true);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessPopupVisible(false);
    setIsLoginMode(true);
    if (registeredUsername) {
      setUsername(registeredUsername);
    }
    setPassword('');
    setConfirmPassword('');
    setFirstname('');
    setLastname('');
    setEmail('');
    setErrorMsg('');
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setErrorMsg('');
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      setErrorMsg("Email tidak boleh kosong");
      setErrorPopupVisible(true);
      return;
    }
    
    try {
      setIsResetting(true);
      const result = await resetPassword(resetEmail);
      if (result) {
        setErrorMsg(result);
        setErrorPopupVisible(true);
      } else {
        setErrorMsg("Tautan reset password telah dikirim. Silakan cek kotak masuk email Anda.");
        setErrorPopupVisible(true);
        setResetPopupVisible(false);
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {fishes.map(fish => (
        <SwimmingFish key={fish.id} delay={fish.delay} startY={fish.startY} onComplete={() => removeFish(fish.id)} />
      ))}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1E293B' : colors.card, borderColor: colors.border }]}>
          <Pressable onPress={toggleTheme} style={styles.themeToggle}>
            <MaterialCommunityIcons 
              name={colorScheme === 'dark' ? 'weather-night' : 'weather-sunny'} 
              size={24} 
              color={colors.textMuted} 
            />
          </Pressable>

          <FadeInView delay={0}>
            <Pressable onPress={spawnFish}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primaryMuted }]}>
                <MaterialCommunityIcons name="fish" size={64} color={colors.primary} />
              </View>
            </Pressable>
          </FadeInView>

        <FadeInView delay={100}>
          <Text style={[styles.title, { color: colors.text }]}>
            {isLoginMode ? 'Selamat Datang' : 'Buat Akun'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {isLoginMode 
              ? 'Masuk untuk menyimpan riwayat dan mengakses fitur profil BettaCare Anda.' 
              : 'Daftar sekarang untuk mengsinkronisasikan data ikan Anda ke Cloud.'}
          </Text>
        </FadeInView>

        <FadeInView delay={200} style={styles.formContainer}>
          
          {!isLoginMode && (
            <>
              <View style={[styles.inputContainer, { backgroundColor: 'transparent', borderColor: colors.border }]}>
                <MaterialCommunityIcons name="account-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Nama Depan"
                  placeholderTextColor={colors.textMuted}
                  value={firstname}
                  onChangeText={setFirstname}
                />
              </View>
              <View style={[styles.inputContainer, { backgroundColor: 'transparent', borderColor: colors.border }]}>
                <MaterialCommunityIcons name="account-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Nama Belakang (Opsional)"
                  placeholderTextColor={colors.textMuted}
                  value={lastname}
                  onChangeText={setLastname}
                />
              </View>
              <View style={[styles.inputContainer, { backgroundColor: 'transparent', borderColor: colors.border }]}>
                <MaterialCommunityIcons name="email-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Email"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </>
          )}

          <View style={[styles.inputContainer, { backgroundColor: 'transparent', borderColor: colors.border }]}>
            <MaterialCommunityIcons 
              name="account-outline" 
              size={20} 
              color={colors.textMuted} 
              style={styles.inputIcon} 
            />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={isLoginMode ? "Username atau Email" : "Username"}
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              keyboardType="default"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: 'transparent', borderColor: colors.border }]}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Kata Sandi"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
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
          {!isLoginMode && <PasswordStrengthMeter password={password} />}

          {!isLoginMode && (
            <View style={[styles.inputContainer, { backgroundColor: 'transparent', borderColor: colors.border }]}>
              <MaterialCommunityIcons name="lock-check-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Konfirmasi Kata Sandi"
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
          )}

          {!isLoginMode && (
            <PasswordMatchFeedback password={password} confirmPassword={confirmPassword} />
          )}

          {isLoginMode && (
            <View style={{ width: '100%', alignItems: 'flex-end', marginTop: 4, marginBottom: 16 }}>
              <Pressable onPress={() => setResetPopupVisible(true)}>
                <Text style={{ color: colors.primary, fontFamily: 'Inter_500Medium', fontSize: 14 }}>
                  Lupa Password?
                </Text>
              </Pressable>
            </View>
          )}

          <Pressable 
            style={[styles.loginBtn, { backgroundColor: colors.primary, opacity: isSubmitting ? 0.7 : 1 }]} 
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginBtnText}>{isLoginMode ? 'Masuk' : 'Daftar'}</Text>
            )}
          </Pressable>

          <Pressable onPress={toggleMode} style={styles.toggleModeBtn}>
            <Text style={[styles.toggleModeText, { color: colors.textMuted }]}>
              {isLoginMode ? 'Belum punya akun? ' : 'Sudah punya akun? '}
              <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>
                {isLoginMode ? 'Daftar' : 'Masuk'}
              </Text>
            </Text>
          </Pressable>
        </FadeInView>
        </View>

        {!isFirebaseConfigured && (
          <FadeInView delay={300}>
            <Text style={[styles.mockInfo, { color: colors.danger }]}>
              *Firebase belum terkonfigurasi. Silakan isi API Key di config/firebase.ts
            </Text>
          </FadeInView>
        )}
      </ScrollView>

      {/* Reset Password Popup */}
      <Modal
        visible={resetPopupVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setResetPopupVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#1E293B' : colors.card }]}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="key-outline" size={64} color={colors.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Reset Password</Text>
            <Text style={[styles.modalMessage, { color: colors.textMuted }]}>
              Masukkan alamat email Anda yang terdaftar untuk menerima tautan reset password.
            </Text>
            
            <View style={[styles.inputContainer, { backgroundColor: 'transparent', borderColor: colors.border, width: '100%' }]}>
              <MaterialCommunityIcons name="email-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                value={resetEmail}
                onChangeText={setResetEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={{ flexDirection: 'row', width: '100%', marginTop: 8 }}>
              <Pressable 
                onPress={() => setResetPopupVisible(false)} 
                style={{ flex: 1, height: 52, justifyContent: 'center', alignItems: 'center', marginRight: 8, borderRadius: 14, backgroundColor: 'rgba(156, 163, 175, 0.1)' }}
              >
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.textMuted }}>Batal</Text>
              </Pressable>

              <Pressable onPress={handleResetPassword} style={{ flex: 1 }} disabled={isResetting}>
                <LinearGradient
                  colors={[colors.primary, colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ width: '100%', height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', opacity: isResetting ? 0.7 : 1 }}
                >
                  {isResetting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFF' }}>Kirim</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Login Error Popup */}
      <Modal
        visible={errorPopupVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setErrorPopupVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#1E293B' : colors.card }]}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="alert-circle" size={64} color="#F9423A" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isLoginMode ? 'Gagal Masuk' : 'Gagal Mendaftar'}
            </Text>
            <Text style={[styles.modalMessage, { color: colors.textMuted }]}>
              {errorMsg}
            </Text>
            
            <Pressable 
              onPress={() => setErrorPopupVisible(false)} 
              style={[styles.modalBtn, { backgroundColor: '#F9423A', width: '100%' }]}
            >
              <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Coba Lagi</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Register Success Popup */}
      <Modal
        visible={successPopupVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSuccessClose}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#1E293B' : colors.card }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)', width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="checkmark-circle" size={56} color="#10B981" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Pendaftaran Berhasil!
            </Text>
            <Text style={[styles.modalMessage, { color: colors.textMuted }]}>
              Akun Anda telah berhasil dibuat. Silakan masuk menggunakan username atau email dan kata sandi Anda.
            </Text>
            
            <Pressable 
              onPress={handleSuccessClose} 
              style={[styles.modalBtn, { backgroundColor: colors.primary, width: '100%' }]}
            >
              <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Masuk Sekarang</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  themeToggle: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 80,
  },
  card: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    alignSelf: 'center',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
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
  loginBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  loginBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFF',
  },
  toggleModeBtn: {
    marginTop: 24,
    alignItems: 'center',
  },
  toggleModeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  mockInfo: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    opacity: 0.9,
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
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  }
});
