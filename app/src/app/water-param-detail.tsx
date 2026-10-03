import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { WATER_PARAMS_DATA } from '../constants/waterParamsData';
import FadeInView from '../components/FadeInView';

export default function WaterParamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const paramData = WATER_PARAMS_DATA.find(p => p.id === Number(id));

  if (!paramData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Data parameter tidak ditemukan.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary }}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  const handleOpenSource = async () => {
    const supported = await Linking.canOpenURL(paramData.sourceUrl);
    if (supported) {
      await Linking.openURL(paramData.sourceUrl);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: paramData.color }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFF" />
          </Pressable>
        </View>
        <View style={styles.headerContent}>
          <View style={styles.iconWrapper}>
            {/* @ts-ignore */}
            <MaterialCommunityIcons name={paramData.icon} size={56} color={paramData.color} />
          </View>
          <Text style={styles.headerTitle}>{paramData.title}</Text>
          <View style={styles.valueBadge}>
            <Text style={[styles.valueText, { color: paramData.color }]}>{paramData.value}</Text>
          </View>
        </View>
        <View style={styles.headerDeco} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <FadeInView delay={0}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Mengapa Ini Penting?</Text>
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="flask-outline" size={24} color={paramData.color} style={{ marginBottom: 12 }} />
            <Text style={[styles.descText, { color: colors.text }]}>{paramData.reason}</Text>
          </View>
        </FadeInView>

        <FadeInView delay={100}>
          <View style={styles.sourceContainer}>
            <MaterialCommunityIcons name="book-open-page-variant" size={20} color={colors.textMuted} />
            <Text style={[styles.sourceLabel, { color: colors.textMuted }]}>Sumber Referensi:</Text>
            <Pressable onPress={handleOpenSource}>
              <Text style={[styles.sourceLink, { color: colors.primary }]}>{paramData.sourceTitle}</Text>
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
    marginBottom: 12,
  },
  valueBadge: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  valueText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
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
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
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
