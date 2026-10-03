import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useDatabase } from '../context/DatabaseContext';
import FadeInView from '../components/FadeInView';
import { resolveImage } from '../utils/imageResolver';
import { filterHistoryByCategory, type HistoryCategory } from '../types/domain';

export default function FilteredHistoryScreen() {
  const { filter } = useLocalSearchParams<{ filter: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { history } = useDatabase();

  const [activeTab, setActiveTab] = useState<HistoryCategory>(
    filter === 'SEHAT' ? 'Sehat' : filter === 'TERINFEKSI' ? 'Terinfeksi' : 'Semua'
  );

  const title = useMemo(() => {
    if (activeTab === 'Sehat') return 'Riwayat Sehat';
    if (activeTab === 'Terinfeksi') return 'Riwayat Terinfeksi';
    return 'Semua Riwayat';
  }, [activeTab]);

  const filteredData = useMemo(
    () => filterHistoryByCategory(history, activeTab),
    [activeTab, history]
  );

  const handleHistoryClick = (item: any) => {
    router.push({
      pathname: '/history-detail',
      params: { id: item.id }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="fish-off" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Belum ada riwayat untuk kategori ini.</Text>
          </View>
        ) : (
          filteredData.map((item, index) => {
            const isHealthy = item.result === 'SEHAT';
            return (
              <FadeInView delay={index * 100} key={item.id}>
                <Pressable 
                  style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleHistoryClick(item)}
                >
                  <Image 
                    source={resolveImage(item.image)} 
                    style={styles.historyThumb} 
                  />
                  <View style={styles.historyInfo}>
                    <Text style={[styles.historyTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.historyDate, { color: colors.textMuted }]}>{item.date}</Text>
                  </View>
                  <View style={[isHealthy ? styles.statusBadge : styles.statusBadgeErr, { backgroundColor: isHealthy ? colors.primaryMuted : colors.dangerMuted }]}>
                    <Text style={[isHealthy ? styles.statusText : styles.statusTextErr, { color: isHealthy ? colors.primary : colors.danger }]}>{item.result}</Text>
                  </View>
                </Pressable>
              </FadeInView>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 8,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  historyThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 14,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    marginBottom: 4,
  },
  historyDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  statusBadgeErr: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusTextErr: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  }
});
