import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import FadeInView from '../components/FadeInView';
import Constants from 'expo-constants';

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: '#F59E0B' }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFF" />
          </Pressable>
        </View>
        <View style={styles.headerContent}>
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons name="information-outline" size={56} color="#F59E0B" />
          </View>
          <Text style={styles.headerTitle}>Tentang Aplikasi</Text>
        </View>
        <View style={styles.headerDeco} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <FadeInView delay={0}>
          <View style={styles.logoContainer}>
            <View style={[styles.logoCircle, { backgroundColor: colors.primaryMuted }]}>
              <MaterialCommunityIcons name="fish" size={64} color={colors.primary} />
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>BettaCare</Text>
            <Text style={[styles.appVersion, { color: colors.textMuted }]}>Versi {appVersion}</Text>
          </View>
        </FadeInView>

        <FadeInView delay={100}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Deskripsi</Text>
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.descText, { color: colors.text }]}>
              BettaCare adalah asisten pintar berbasis kecerdasan buatan (Artificial Intelligence) yang dirancang 
              khusus untuk membantu para pembudidaya dan penghobi ikan cupang (Betta fish). Aplikasi ini dapat 
              mendeteksi penyakit umum pada ikan cupang hanya melalui kamera ponsel Anda, serta memberikan 
              panduan perawatan interaktif untuk menjaga kualitas air dan kesehatan ikan Anda.
            </Text>
          </View>
        </FadeInView>

        <FadeInView delay={200}>
          <View style={styles.footerInfo}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>© {new Date().getFullYear()} BettaCare System.</Text>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>Semua Hak Cipta Dilindungi.</Text>
          </View>
        </FadeInView>

      </ScrollView>
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
    paddingTop: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    marginBottom: 4,
  },
  appVersion: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    marginBottom: 12,
  },
  section: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  descText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'justify',
  },
  devAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  devName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    marginBottom: 4,
  },
  devRole: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  footerInfo: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  footerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginBottom: 4,
  }
});
