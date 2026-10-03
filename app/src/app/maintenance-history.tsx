import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useDatabase } from '../context/DatabaseContext';
import { Swipeable } from 'react-native-gesture-handler';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import FadeInView from '../components/FadeInView';

type FilterType = 'daily' | 'weekly' | 'monthly';

export default function MaintenanceHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { maintenanceHistory, aquarium, removeMaintenanceHistory } = useDatabase();
  
  const [activeFilter, setActiveFilter] = useState<FilterType>('daily');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredHistory = useMemo(() => {
    const now = new Date();
    return maintenanceHistory.filter(item => {
      const itemDate = new Date(item.completedAt);
      if (activeFilter === 'daily') {
        return itemDate.toDateString() === now.toDateString();
      } else if (activeFilter === 'weekly') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return itemDate >= oneWeekAgo && itemDate <= now;
      } else if (activeFilter === 'monthly') {
        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [maintenanceHistory, activeFilter]);

  const getAquariumName = (id: string) => {
    const fish = aquarium.find(a => a.id === id);
    return fish ? fish.name : 'Akuarium Dihapus';
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* App Bar */}
      <View style={[styles.appBar, { paddingTop: insets.top + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtnHeader} hitSlop={10}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.appBarTitle, { color: colors.text }]}>Riwayat Perawatan</Text>
        <View style={styles.backBtnHeader} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['daily', 'weekly', 'monthly'] as FilterType[]).map((filter) => (
          <Pressable
            key={filter}
            style={[
              styles.filterTab, 
              activeFilter === filter ? { backgroundColor: colors.primary } : { backgroundColor: 'rgba(0,0,0,0.05)' }
            ]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[
              styles.filterText, 
              { color: activeFilter === filter ? '#FFF' : colors.textMuted }
            ]}>
              {filter === 'daily' ? 'Hari Ini' : filter === 'weekly' ? 'Minggu Ini' : 'Bulan Ini'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredHistory.length > 0 ? (
          filteredHistory.map((item, index) => (
            <FadeInView key={item.id} delay={index * 50}>
              <Swipeable
                renderRightActions={() => renderRightActions(item.id)}
              >
                <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <MaterialCommunityIcons name="check-circle" size={24} color="#10B981" />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={[styles.historyTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.historyAquarium, { color: colors.textMuted }]}>
                      Akuarium: {getAquariumName(item.aquariumId)}
                    </Text>
                  </View>
                  <Text style={[styles.historyTime, { color: colors.textMuted }]}>
                    {formatDate(item.completedAt)}
                  </Text>
                </View>
              </Swipeable>
            </FadeInView>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-text-off-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.text }]}>Belum ada riwayat</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
              Anda belum menyelesaikan tugas perawatan apapun pada periode ini.
            </Text>
          </View>
        )}
      </ScrollView>

      <ConfirmDeleteModal 
        visible={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await removeMaintenanceHistory(deleteId);
            setDeleteId(null);
          }
        }}
        title="Hapus Riwayat Perawatan?"
        message="Riwayat ini akan dihapus secara permanen dan tidak dapat dikembalikan."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtnHeader: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  appBarTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    flex: 1,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    marginBottom: 4,
  },
  historyAquarium: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  historyTime: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginLeft: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  deleteAction: {
    backgroundColor: '#F9423A',
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    marginBottom: 12,
    borderRadius: 16,
    marginLeft: 10,
  },
});
