import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import FadeInView from '../components/FadeInView';

interface FaqItem {
  category: string;
  question: string;
  answer: string;
}

const CATEGORIES = ['Semua', 'Pemindaian & AI', 'Fitur Aplikasi', 'Akun & Keamanan', 'Koneksi & Data'];

const FAQ_DATA: FaqItem[] = [
  {
    category: 'Pemindaian & AI',
    question: 'Bagaimana cara memindai dan mendiagnosis ikan cupang?',
    answer: 'Pilih menu "Pindai" di bilah navigasi bawah. Posisikan kamera sejajar dengan ikan di dalam wadah berlatar bersih dengan pencahayaan cukup, lalu tekan tombol jepret. AI kami akan memproses citra dan memberikan hasil diagnosis (Sehat / Tidak Sehat) beserta tingkat keyakinan (confidence score) dalam hitungan detik.'
  },
  {
    category: 'Pemindaian & AI',
    question: 'Teknologi AI apa yang digunakan untuk diagnosis penyakit?',
    answer: 'BettaCare mengadopsi arsitektur multimodal canggih yang menggabungkan Deep Learning MobileNetV2 (untuk klasifikasi fitur visual global) dengan algoritma Gray-Level Co-occurrence Matrix (GLCM) serta analisis intensitas warna RGB (untuk ekstraksi tekstur sisik dan sirip ikan).'
  },
  {
    category: 'Pemindaian & AI',
    question: 'Mengapa hasil scan saya menampilkan "Bukan Ikan Cupang"?',
    answer: 'Aplikasi dilengkapi modul verifikasi objek Out-of-Distribution (OOD). Apabila gambar yang diambil buram, terlalu gelap, bukan merupakan ikan cupang, atau objek lain di luar domain medis, sistem otomatis menolaknya demi menjaga validitas dan mencegah kesalahan diagnosis medis.'
  },
  {
    category: 'Pemindaian & AI',
    question: 'Apa fungsi bukti visual (Grayscale, GLCM Heatmap, RGB, Histogram)?',
    answer: 'Pada layar hasil analisis, Anda dapat melihat transparansi proses ekstraksi fitur ilmiah AI, mulai dari citra Grayscale, Matriks GLCM skala log, kanal warna terpisah (R, G, B), hingga kurva Histogram. Setiap ubin gambar dapat diketuk untuk diperbesar (zoom) secara interaktif.'
  },
  {
    category: 'Fitur Aplikasi',
    question: 'Bagaimana cara memperbesar (zoom) foto dan visualisasi?',
    answer: 'Cukup ketuk foto ikan atau ubin visualisasi fitur di layar Hasil Analisis maupun Detail Riwayat. Anda dapat mencubit layar dengan 2 jari (pinch-to-zoom) hingga 5x, mengetuk dua kali (double tap) untuk zoom instan, menggeser foto yang diperbesar (pan), serta mengusap ke bawah untuk menutup kembali.'
  },
  {
    category: 'Fitur Aplikasi',
    question: 'Bagaimana cara menghapus data Riwayat Pemindaian?',
    answer: 'Buka menu "Riwayat", ketuk salah satu riwayat untuk membuka halaman Detail Analisis, lalu ketuk ikon tempat sampah di sudut kanan atas. Anda akan diminta mengonfirmasi penghapusan agar data tidak terhapus secara tidak sengaja.'
  },
  {
    category: 'Fitur Aplikasi',
    question: 'Bagaimana cara menggunakan fitur Akuarium & Jadwal Perawatan?',
    answer: 'Pada menu "Akuarium", Anda dapat mendaftarkan profil ikan cupang peliharaan Anda. Aplikasi akan otomatis membuatkan template jadwal perawatan harian (seperti Ganti Air 30%, Beri Pakan Pelet, Cek Filter). Centang tugas yang selesai untuk mencatat riwayat pemeliharaan (Maintenance History).'
  },
  {
    category: 'Akun & Keamanan',
    question: 'Apakah saya bisa masuk (login) dengan Username atau Email?',
    answer: 'Ya! Sistem BettaCare mendukung fitur Login Ganda (Dual Login). Anda dapat masuk menggunakan Username maupun alamat Email terdaftar dengan kata sandi yang sama.'
  },
  {
    category: 'Akun & Keamanan',
    question: 'Bagaimana jika saya lupa kata sandi akun saya?',
    answer: 'Pada layar Masuk (Login), ketuk opsi "Lupa Kata Sandi?". Masukkan alamat email terdaftar Anda, lalu periksa kotak masuk atau folder spam email Anda untuk membuka tautan pemulihan kata sandi resmi dari Firebase.'
  },
  {
    category: 'Koneksi & Data',
    question: 'Apakah aplikasi ini memerlukan koneksi internet?',
    answer: 'Fitur pemindaian kamera cerdas, sinkronisasi profil, dan penyimpanan riwayat cloud memerlukan koneksi internet aktif. Namun, panduan Ensiklopedia Penyakit dan data riwayat lokal dapat dibaca saat perangkat sedang offline.'
  }
];

export default function FAQScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const filteredData = selectedCategory === 'Semua'
    ? FAQ_DATA
    : FAQ_DATA.filter((item) => item.category === selectedCategory);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: '#10B981' }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <MaterialCommunityIcons name="arrow-left" size={26} color="#FFF" />
          </Pressable>
        </View>
        <View style={styles.headerContent}>
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons name="help-circle-outline" size={52} color="#10B981" />
          </View>
          <Text style={styles.headerTitle}>Pusat Bantuan & FAQ</Text>
        </View>
        <View style={styles.headerDeco} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => {
                  setSelectedCategory(cat);
                  setExpandedIndex(null);
                }}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  }
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: isSelected ? '#FFF' : colors.textMuted }
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Pertanyaan ({filteredData.length})
        </Text>
        
        {filteredData.map((item, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <FadeInView delay={index * 60} key={`${item.category}-${index}`}>
              <View style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Pressable onPress={() => toggleExpand(index)} style={styles.questionRow}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <View style={[styles.badge, { backgroundColor: colors.primaryMuted }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>{item.category}</Text>
                    </View>
                    <Text style={[styles.questionText, { color: colors.text }]}>{item.question}</Text>
                  </View>
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

        {/* Footer Contact Help Card */}
        <View style={[styles.helpCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="information-outline" size={24} color={colors.primary} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.helpCardTitle, { color: colors.text }]}>Punya pertanyaan lain?</Text>
            <Text style={[styles.helpCardText, { color: colors.textMuted }]}>
              Pelajari rincian penelitian dan pengembang aplikasi melalui menu Tentang Aplikasi di profil Anda.
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: 'relative',
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backBtn: {
    padding: 8,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 24,
    zIndex: 2,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#FFF',
    marginBottom: 0,
    textAlign: 'center',
  },
  headerDeco: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    top: -40,
    right: -60,
    zIndex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  categoryScroll: {
    paddingBottom: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    marginBottom: 14,
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
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  questionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    lineHeight: 21,
  },
  answerContainer: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  answerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
  },
  helpCardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    marginBottom: 4,
  },
  helpCardText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
});
