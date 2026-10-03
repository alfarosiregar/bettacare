import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import FadeInView from '../components/FadeInView';

const FAQ_DATA = [
  {
    question: 'Bagaimana cara memindai ikan?',
    answer: 'Pilih menu "Pindai" di bagian bawah layar. Arahkan kamera ponsel Anda sejajar dengan ikan, pastikan pencahayaan cukup terang, lalu tekan tombol jepret. AI kami akan memproses gambar tersebut dalam beberapa detik.'
  },
  {
    question: 'Seberapa akurat hasil deteksi AI ini?',
    answer: 'Sistem klasifikasi kami dilatih menggunakan ribuan dataset gambar ikan cupang dengan tingkat akurasi rata-rata di atas 90%. Namun, hasil deteksi ini hanya bersifat referensi dan tidak menggantikan diagnosis pakar perikanan.'
  },
  {
    question: 'Apa yang harus dilakukan jika ikan terdeteksi sakit?',
    answer: 'Segera pisahkan ikan ke akuarium karantina. Anda dapat membaca panduan penanganan awal pada menu "Ensiklopedia Penyakit" di halaman Beranda untuk mengetahui tindakan medis pertama yang tepat.'
  },
  {
    question: 'Apakah aplikasi ini membutuhkan internet?',
    answer: 'Sebagian besar fitur utama seperti Ensiklopedia dan membaca Riwayat dapat diakses secara offline. Namun, untuk fitur deteksi kamera (Scan) dan sinkronisasi gambar, koneksi internet aktif diperlukan.'
  },
  {
    question: 'Bagaimana cara menghapus Riwayat?',
    answer: 'Saat ini semua data riwayat bersifat tetap (read-only) untuk keperluan pelacakan grafik kesehatan (Tren Kesehatan). Fitur hapus riwayat akan ditambahkan pada pembaruan mendatang.'
  }
];

export default function FAQScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: '#10B981' }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFF" />
          </Pressable>
        </View>
        <View style={styles.headerContent}>
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons name="help-circle-outline" size={56} color="#10B981" />
          </View>
          <Text style={styles.headerTitle}>FAQ</Text>
        </View>
        <View style={styles.headerDeco} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Pertanyaan Umum</Text>
        
        {FAQ_DATA.map((item, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <FadeInView delay={index * 100} key={index}>
              <View style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Pressable onPress={() => toggleExpand(index)} style={styles.questionRow}>
                  <Text style={[styles.questionText, { color: colors.text }]}>{item.question}</Text>
                  <MaterialCommunityIcons 
                    name={isExpanded ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color={colors.primary} 
                  />
                </Pressable>
                {isExpanded && (
                  <View style={[styles.answerContainer, { borderTopColor: colors.border }]}>
                    <Text style={[styles.answerText, { color: colors.textMuted }]}>{item.answer}</Text>
                  </View>
                )}
              </View>
            </FadeInView>
          );
        })}
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
    marginBottom: 16,
  },
  faqCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  questionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    flex: 1,
    marginRight: 16,
  },
  answerContainer: {
    padding: 16,
    paddingTop: 0,
  },
  answerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  }
});
