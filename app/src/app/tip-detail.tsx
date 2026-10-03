import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { TIPS_DATA } from '../constants/tipsData';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FadeInView from '../components/FadeInView';

export default function TipDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const tip = TIPS_DATA.find(t => t.id === id);

  if (!tip) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Tips tidak ditemukan.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary }}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 20 }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>Kembali</Text>
        </Pressable>

        <FadeInView delay={0}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryMuted }]}>
            <MaterialCommunityIcons name="water-percent" size={48} color={colors.primary} />
          </View>
        </FadeInView>

        <FadeInView delay={100}>
          <Text style={[styles.title, { color: colors.text }]}>{tip.title}</Text>
        </FadeInView>

        <FadeInView delay={200}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.fullText, { color: colors.textMuted }]}>{tip.fullText}</Text>
          </View>
        </FadeInView>

        <FadeInView delay={300}>
          <Pressable 
            style={styles.sourceContainer}
            onPress={() => tip.url && Linking.openURL(tip.url)}
          >
            <MaterialCommunityIcons name="book-open-page-variant" size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.sourceLabel, { color: colors.text }]}>Sumber Referensi:</Text>
          </Pressable>
          <Text 
            style={[styles.sourceText, { color: colors.primary, textDecorationLine: 'underline' }]}
            onPress={() => tip.url && Linking.openURL(tip.url)}
          >
            {tip.source}
          </Text>
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
    paddingBottom: 40,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    marginBottom: 24,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    marginBottom: 32,
  },
  fullText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 24,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sourceLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  sourceText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    marginLeft: 28,
  }
});
