import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import FadeInView from '../../components/FadeInView';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { resolveImage } from '../../utils/imageResolver';
import { useRouter } from 'expo-router';
import { useDatabase } from '../../context/DatabaseContext';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { filterHistoryByCategory, type HistoryCategory } from '../../types/domain';


export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();
  const { history, removeHistory } = useDatabase();
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [activeCategory, setActiveCategory] = React.useState<HistoryCategory>('Semua');

  // Filter terpusat di util murni (dipakai juga oleh filtered-history):
  // 'Terinfeksi' = semua hasil selain SEHAT dan BUKAN IKAN CUPANG.
  const filteredHistory = filterHistoryByCategory(history, activeCategory);

  const handleHistoryClick = (item: any) => {
    // Pass image as index or string, but since we use require, we can't easily pass it via URL params natively without stringifying
    // For mock purposes, we will pass the ID and find it in the details page, or pass the static uri if it was a web url.
    // Since we are using local requires, passing it via router params will serialize it to a number (asset id).
    router.push({
      pathname: '/history-detail',
      params: { id: item.id }
    });
  };

  const renderRightActions = (id: string) => {
    return (
      <Pressable 
        style={styles.deleteAction} 
        onPress={() => setDeleteId(id)}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={24} color="#FFF" />
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Riwayat Pindaian</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Semua catatan klasifikasi kesehatan ikan Anda.</Text>
      </View>

      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {['Semua', 'Sehat', 'Terinfeksi'].map(cat => (
            <Pressable
              key={cat}
              style={[
                styles.categoryChip,
                activeCategory === cat ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.card, borderColor: colors.border }
              ]}
              onPress={() => setActiveCategory(cat as any)}
            >
              <Text style={[
                styles.categoryText,
                activeCategory === cat ? { color: '#FFF' } : { color: colors.textMuted }
              ]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {filteredHistory.map((item, index) => {
          const isHealthy = item.result === 'SEHAT';
          return (
            <FadeInView delay={index * 50} key={item.id}>
              <Swipeable renderRightActions={() => renderRightActions(item.id)}>
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
              </Swipeable>
            </FadeInView>
          );
        })}
        
        <FadeInView delay={history.length * 50}>
          <View style={styles.emptyStateContainer}>
            <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
              {history.length === 0 
                ? 'Belum ada riwayat pindaian. Data Anda akan otomatis tersimpan ke Cloud.'
                : 'Semua riwayat telah disinkronkan dengan aman ke Cloud.'}
            </Text>
          </View>
        </FadeInView>
      </ScrollView>

      <ConfirmDeleteModal 
        visible={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) removeHistory(deleteId);
          setDeleteId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 20,
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
  categoryContainer: {
    marginBottom: 20,
  },
  categoryScroll: {
    paddingHorizontal: 24,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categoryText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
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
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: 'rgba(0,0,0,0.1)'
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
  emptyStateContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  emptyStateText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
  },
  deleteAction: {
    backgroundColor: '#F9423A',
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    height: 80,
    borderRadius: 16,
    marginBottom: 12,
    marginLeft: 10,
  }
});
