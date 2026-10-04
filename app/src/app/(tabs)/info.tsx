import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import FadeInView from '../../components/FadeInView';

/* ───────────────────── Feature Card ───────────────────── */
const FeatureCard = ({
  icon,
  iconColor,
  iconBg,
  title,
  desc,
  colors
}: {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  desc: string;
  colors: any;
}) => (
  <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
      <MaterialCommunityIcons name={icon as any} size={28} color={iconColor} />
    </View>
    <View style={styles.featureTextContainer}>
      <Text style={[styles.featureTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.featureDesc, { color: colors.textMuted }]}>{desc}</Text>
    </View>
  </View>
);

export default function InfoScreen() {
  const insets = useSafeAreaInsets();
  const { colorScheme, colors } = useTheme();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, backgroundColor: colors.background }]}>
      <FadeInView delay={0}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Edukasi & Informasi</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Pelajari lebih lanjut tentang ikan cupang dan teknologi yang digunakan.</Text>
        </View>
      </FadeInView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── APA ITU IKAN CUPANG ── */}
        <FadeInView delay={100}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Apa itu Ikan Cupang?</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.fishAvatar, { backgroundColor: colors.primaryMuted, borderColor: colors.primaryMuted }]}>
            <Text style={styles.fishEmoji}>🐠</Text>
          </View>
          <Text style={[styles.infoText, { color: colors.text }]}>
            Ikan Cupang (Betta fish) adalah ikan air tawar hias yang populer karena warna cerah dan siripnya yang indah. Ikan ini sering disebut sebagai "ikan petarung siam" karena sifat agresifnya. 
            {'\n\n'}
            Perawatan dan kondisi air yang tepat sangat penting untuk menjaga kesehatannya agar terhindar dari berbagai penyakit seperti jamur, busuk sirip, atau parasit.
          </Text>
        </View>
        </FadeInView>

        {/* ── HOW IT WORKS ── */}
        <FadeInView delay={200}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Cara Kerja Teknologi</Text>
          
          <FeatureCard
          icon="brain"
          iconColor={colors.primary}
          iconBg={colors.primaryMuted}
          title="Convolutional Neural Network"
          desc="Model deep learning yang dilatih untuk mengidentifikasi berbagai penyakit ikan cupang dengan akurasi tinggi."
          colors={colors}
        />
        <FeatureCard
          icon="texture"
          iconColor="#3B82F6"
          iconBg="rgba(59, 130, 246, 0.15)"
          title="Ekstraksi GLCM"
          desc="Menganalisis matriks kejadian bersama derajat keabuan (GLCM) untuk mendeteksi variasi tekstur mikroskopis pada sisik ikan."
          colors={colors}
        />
        <FeatureCard
          icon="palette"
          iconColor={colors.danger}
          iconBg={colors.dangerMuted}
          title="Analisis Fitur RGB"
          desc="Mengukur degradasi warna dan pergeseran saturasi untuk mendeteksi tanda-tanda awal infeksi atau stres."
          colors={colors}
          />
        </FadeInView>

        <FadeInView delay={300}>
          <View style={styles.footer}>
          <MaterialCommunityIcons name="shield-check" size={24} color={colors.textMuted} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            BettaCare - Proyek Skripsi
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  
  /* Sections */
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    marginBottom: 16,
    marginTop: 10,
  },
  
  /* Info Card */
  infoCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 30,
    borderWidth: 1,
    alignItems: 'center',
  },
  fishAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  fishEmoji: {
    fontSize: 36,
  },
  infoText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
  },

  /* Feature cards */
  featureCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    marginBottom: 4,
  },
  featureDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },
  
  /* Footer */
  footer: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    opacity: 0.7,
  },
  footerText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
