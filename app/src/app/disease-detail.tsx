import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { DISEASE_DATA } from '../constants/diseaseData';
import FadeInView from '../components/FadeInView';

export default function DiseaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const disease = DISEASE_DATA.find(d => d.id === Number(id));

  if (!disease) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Data penyakit tidak ditemukan.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary }}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  const handleOpenSource = async () => {
    const supported = await Linking.canOpenURL(disease.sourceUrl);
    if (supported) {
      await Linking.openURL(disease.sourceUrl);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: disease.color }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFF" />
          </Pressable>
        </View>
        <View style={styles.headerContent}>
          <View style={styles.iconWrapper}>
            {/* @ts-ignore */}
            <MaterialCommunityIcons name={disease.icon} size={56} color={disease.color} />
          </View>
          <Text style={styles.headerTitle}>{disease.title}</Text>
        </View>
        <View style={styles.headerDeco} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <FadeInView delay={0}>
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.descText, { color: colors.text }]}>{disease.description}</Text>
          </View>
        </FadeInView>

        <FadeInView delay={100}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Gejala (Symptoms)</Text>
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {disease.symptoms.map((symptom, index) => (
              <View key={index} style={styles.listItem}>
                <MaterialCommunityIcons name="circle-small" size={24} color={disease.color} style={styles.bulletIcon} />
                <Text style={[styles.listText, { color: colors.text }]}>{symptom}</Text>
              </View>
            ))}
          </View>
        </FadeInView>

        <FadeInView delay={200}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Cara Penanganan</Text>
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.treatmentHeader}>
              <MaterialCommunityIcons name="medical-bag" size={24} color="#10B981" />
              <Text style={[styles.treatmentTitle, { color: colors.text }]}>Tindakan Medis</Text>
            </View>
            <Text style={[styles.descText, { color: colors.text, marginTop: 12 }]}>{disease.treatment}</Text>
          </View>
        </FadeInView>

        <FadeInView delay={300}>
          <View style={styles.sourceContainer}>
            <MaterialCommunityIcons name="book-open-page-variant" size={20} color={colors.textMuted} />
            <Text style={[styles.sourceLabel, { color: colors.textMuted }]}>Sumber Referensi:</Text>
            <Pressable onPress={handleOpenSource}>
              <Text style={[styles.sourceLink, { color: colors.primary }]}>{disease.sourceTitle}</Text>
            </Pressable>
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
    fontSize: 28,
    color: '#FFF',
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
    marginTop: 8,
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
    marginBottom: 12,
  },
  bulletIcon: {
    marginTop: -2,
    marginLeft: -8,
  },
  listText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  treatmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  treatmentTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 16,
    marginBottom: 40,
    paddingHorizontal: 8,
  },
  sourceLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginLeft: 6,
    marginRight: 6,
  },
  sourceLink: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    textDecorationLine: 'underline',
  }
});
