import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import FadeInView from '../components/FadeInView';

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: '#3B82F6' }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFF" />
          </Pressable>
        </View>
        <View style={styles.headerContent}>
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons name="shield-lock-outline" size={56} color="#3B82F6" />
          </View>
          <Text style={styles.headerTitle}>Privasi & Keamanan</Text>
        </View>
        <View style={styles.headerDeco} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <FadeInView delay={0}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pengantar</Text>
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.descText, { color: colors.text }]}>
              BettaCare sangat menghargai privasi data Anda. Sebagai aplikasi prototipe asisten kesehatan cerdas, 
              kami berkomitmen untuk memastikan keamanan setiap informasi yang Anda proses melalui aplikasi ini.
            </Text>
          </View>
        </FadeInView>

        <FadeInView delay={100}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pemrosesan Gambar (Scanning)</Text>
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.listItem}>
              <MaterialCommunityIcons name="camera-lock" size={24} color="#3B82F6" style={styles.listIcon} />
              <View style={styles.listTextContainer}>
                <Text style={[styles.listTitle, { color: colors.text }]}>Analisis Lokal</Text>
                <Text style={[styles.listDesc, { color: colors.textMuted }]}>Semua foto ikan yang dipindai melalui kamera diproses langsung pada memori ponsel Anda (On-Device Processing).</Text>
              </View>
            </View>
            <View style={styles.listItem}>
              <MaterialCommunityIcons name="cloud-check-outline" size={24} color="#3B82F6" style={styles.listIcon} />
              <View style={styles.listTextContainer}>
                <Text style={[styles.listTitle, { color: colors.text }]}>Penyimpanan Cloud Aman</Text>
                <Text style={[styles.listDesc, { color: colors.textMuted }]}>Data riwayat pindaian Anda disinkronkan secara aman ke Firebase Cloud, memastikan Anda dapat mengaksesnya kapan saja tanpa khawatir hilang.</Text>
              </View>
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={200}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Kredensial</Text>
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.descText, { color: colors.text }]}>
              Sistem autentikasi aplikasi ini didukung oleh Firebase Authentication, yang menjamin keamanan kredensial dan kata sandi Anda dengan standar enkripsi industri terkini.
            </Text>
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
    paddingTop: 32,
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
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  listIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  listTextContainer: {
    flex: 1,
  },
  listTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    marginBottom: 4,
  },
  listDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
});
