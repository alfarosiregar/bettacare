import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import FadeInView from '../../components/FadeInView';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { TIPS_DATA } from '../../constants/tipsData';
import { Concept2 } from '../../components/Concepts';
import { DISEASE_DATA } from '../../constants/diseaseData';
import { WATER_PARAMS_DATA } from '../../constants/waterParamsData';
import { getWeeklyChartData } from '../../utils/chartUtils';
import { resolveImage } from '../../utils/imageResolver';
import Animated, { 
  FadeIn, 
  FadeOut, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence, 
  Easing, 
  runOnJS,
  withDelay,
  withRepeat
} from 'react-native-reanimated';

const AnimatedBar = ({ healthyPct, sickPct, day, colors, styles, index }: any) => {
  const anim = useSharedValue(0);

  React.useEffect(() => {
    setTimeout(() => {
      anim.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.exp) });
    }, index * 100);
  }, []);

  const healthyStyle = useAnimatedStyle(() => {
    return {
      height: `${healthyPct * anim.value}%`
    } as any;
  });

  const sickStyle = useAnimatedStyle(() => {
    return {
      height: `${sickPct * anim.value}%`,
      bottom: `${healthyPct * anim.value}%`
    } as any;
  });

  return (
    <View style={styles.barColumn}>
      <View style={styles.barWrapper}>
        <Animated.View style={[styles.barHealthy, { backgroundColor: colors.primary }, healthyStyle]} />
        <Animated.View style={[styles.barSick, { backgroundColor: '#F9423A' }, sickStyle]} />
      </View>
      <Text style={[styles.barLabel, { color: colors.textMuted }]}>{day}</Text>
    </View>
  );
};

const SwimmingFish = ({ onComplete, delay, startY }: { onComplete: () => void, delay: number, startY: number }) => {
  const { width } = Dimensions.get('window');
  const translateX = useSharedValue(-100);
  const translateY = useSharedValue(startY); 
  const rotate = useSharedValue(0);

  useEffect(() => {
    translateX.value = withDelay(delay, withTiming(width + 100, {
      duration: 3500,
      easing: Easing.inOut(Easing.ease)
    }, (finished) => {
      if (finished) {
        runOnJS(onComplete)();
      }
    }));

    translateY.value = withDelay(delay, withSequence(
      withTiming(translateY.value - 60, { duration: 1750, easing: Easing.inOut(Easing.sin) }),
      withTiming(translateY.value + 60, { duration: 1750, easing: Easing.inOut(Easing.sin) })
    ));

    rotate.value = withDelay(delay, withSequence(
      withTiming(-20, { duration: 1750, easing: Easing.inOut(Easing.sin) }),
      withTiming(20, { duration: 1750, easing: Easing.inOut(Easing.sin) })
    ));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` }
    ],
    position: 'absolute',
    zIndex: 9999,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <MaterialCommunityIcons name="fish" size={60} color="#10B981" />
    </Animated.View>
  );
};

const FUN_FACTS = [
  "Cupang jantan bertugas merawat telur hingga menetas di dalam sarang busanya.",
  "Ikan cupang bisa menghirup udara langsung dari permukaan air berkat organ labirin.",
  "Cupang alam warnanya kusam; warna cerah cupang hias adalah hasil mutasi genetik bertahun-tahun."
];

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme, colors, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { history, aquarium, tasks, toggleTask, removeHistory } = useDatabase();

  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [funFactIndex, setFunFactIndex] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [currentDiseaseIndex, setCurrentDiseaseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % TIPS_DATA.length);
      setFunFactIndex((prev) => (prev + 1) % FUN_FACTS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const [fishes, setFishes] = useState<{ id: number, delay: number, startY: number }[]>([]);

  const spawnFish = () => {
    const baseId = Date.now();
    setFishes(prev => [
      ...prev, 
      { id: baseId + 1, delay: 0, startY: 80 },
      { id: baseId + 2, delay: 500, startY: 200 },
      { id: baseId + 3, delay: 1000, startY: 130 }
    ]);
  };

  const removeFish = (id: number) => {
    setFishes(prev => prev.filter(f => f.id !== id));
  };

  const aquariumScrollRef = React.useRef<ScrollView>(null);
  const [currentAqIndex, setCurrentAqIndex] = useState(0);

  useEffect(() => {
    if (aquarium.length > 1) {
      const interval = setInterval(() => {
        setCurrentAqIndex((prev) => {
          const next = (prev + 1) % aquarium.length;
          if (aquariumScrollRef.current) {
            aquariumScrollRef.current.scrollTo({ x: next * 376, animated: true });
          }
          return next;
        });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [aquarium.length]);

  const totalScans = history.length;
  const healthyScans = history.filter(i => i.result === 'SEHAT').length;
  const infectedScans = history.filter(i => i.result !== 'SEHAT').length;

  const handleHistoryClick = (item: any) => {
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
      {fishes.map(fish => (
        <SwimmingFish key={fish.id} delay={fish.delay} startY={fish.startY} onComplete={() => removeFish(fish.id)} />
      ))}
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        
        {/* Header Section */}
        <FadeInView delay={0} style={{ backgroundColor: colors.background, zIndex: 100, paddingBottom: 5, paddingTop: 10, marginHorizontal: -24, paddingHorizontal: 24 }}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: colors.textMuted }]}>Halo, {user?.fullname || 'Pengguna'}!</Text>
              <Text style={[styles.title, { color: colors.text }]}>BettaCare Dashboard</Text>
            </View>
            <View style={styles.headerRight}>
              <Pressable onPress={toggleTheme} style={[styles.themeToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <MaterialCommunityIcons 
                  name={colorScheme === 'dark' ? 'weather-night' : 'weather-sunny'} 
                  size={24} 
                  color={colors.primary} 
                />
              </Pressable>
              <Pressable 
                style={[styles.avatarContainer, { backgroundColor: colors.primaryMuted, borderColor: colors.primaryMuted }]}
                onPress={spawnFish}
              >
                <MaterialCommunityIcons name="fish" size={28} color={colors.primary} />
              </Pressable>
            </View>
          </View>
        </FadeInView>

        {/* Scan Now Card */}
        <FadeInView delay={50}>
          <Pressable 
            style={[styles.scanCard, { backgroundColor: '#F9423A', shadowColor: '#F9423A' }]}
            onPress={() => router.push('/camera')}
          >
            <View style={styles.scanCardContent}>
              <View style={styles.scanIconContainer}>
                <MaterialCommunityIcons name="qrcode-scan" size={36} color="#FFF" />
              </View>
              <View style={styles.scanTextContainer}>
                <Text style={styles.scanTitle}>Diagnosis Sekarang</Text>
                <Text style={styles.scanDesc}>Pindai ikan cupang Anda untuk mendeteksi penyakit dengan AI.</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#FFF" />
            </View>
            <View style={styles.scanDecoration1} />
            <View style={styles.scanDecoration2} />
          </Pressable>
        </FadeInView>

        {/* Quick Stats */}
        <FadeInView delay={100}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Statistik Singkat</Text>
          <View style={styles.statsContainer}>
            <Pressable 
              onPress={() => router.push({ pathname: '/filtered-history', params: { filter: 'TOTAL' } })}
              style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <MaterialCommunityIcons name="history" size={24} color="#3B82F6" />
              <Text style={[styles.statNumber, { color: colors.text }]}>{totalScans}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
            </Pressable>
            <Pressable 
              onPress={() => router.push({ pathname: '/filtered-history', params: { filter: 'SEHAT' } })}
              style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />
              <Text style={[styles.statNumber, { color: colors.text }]}>{healthyScans}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sehat</Text>
            </Pressable>
            <Pressable 
              onPress={() => router.push({ pathname: '/filtered-history', params: { filter: 'TERINFEKSI' } })}
              style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <MaterialCommunityIcons name="alert-circle" size={24} color={colors.danger} />
              <Text style={[styles.statNumber, { color: colors.text }]}>{infectedScans}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Terinfeksi</Text>
            </Pressable>
          </View>
        </FadeInView>

        {/* ───────────────────────────────────────────────────────── */}
        {/* MULTI-AQUARIUM COMMAND CENTER */}
        {/* ───────────────────────────────────────────────────────── */}
        <FadeInView delay={150}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, flex: 1 }]} numberOfLines={1}>Akuarium Saya</Text>
            {aquarium.length > 1 && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {aquarium.map((_, i) => (
                  <View 
                    key={i} 
                    style={{ 
                      width: currentAqIndex === i ? 16 : 6, 
                      height: 6, 
                      borderRadius: 3, 
                      backgroundColor: currentAqIndex === i ? colors.primary : colors.border,
                      marginLeft: 6 
                    }} 
                  />
                ))}
              </View>
            )}
          </View>
          <ScrollView 
            ref={aquariumScrollRef}
            horizontal 
            showsHorizontalScrollIndicator={false} 
            snapToInterval={376} 
            decelerationRate="fast" 
            contentContainerStyle={{ paddingRight: 24 }}
            onMomentumScrollEnd={(e) => {
              const offsetX = e.nativeEvent.contentOffset.x;
              setCurrentAqIndex(Math.round(offsetX / 376));
            }}
          >
            {aquarium.map((fish) => {
              const fishTasks = tasks.filter(t => t.aquariumId === fish.id);
              return (
                <Concept2 
                  key={fish.id} 
                  fish={fish} 
                  tasks={fishTasks} 
                  toggleTask={toggleTask} 
                  colors={colors} 
                  colorScheme={colorScheme} 
                />
              );
            })}
          </ScrollView>
        </FadeInView>
        {/* ───────────────────────────────────────────────────────── */}

        {/* 2. Widget Parameter Air Ideal */}
        <FadeInView delay={200}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Parameter Air Ideal</Text>
          <View style={styles.waterParamsContainer}>
            {WATER_PARAMS_DATA.map((param) => (
              <Pressable 
                key={param.id} 
                style={[styles.waterBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push({ pathname: '/water-param-detail', params: { id: param.id } })}
              >
                <MaterialCommunityIcons name={param.icon as any} size={24} color={param.color} style={{ marginBottom: 4 }} />
                <Text style={[styles.waterVal, { color: colors.text }]}>{param.value}</Text>
                <Text style={[styles.waterLabel, { color: colors.textMuted }]}>{param.title}</Text>
              </Pressable>
            ))}
          </View>
        </FadeInView>

        {/* 3. Grafik Tren Kesehatan */}
        <FadeInView delay={250}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tren Kesehatan (7 Hari)</Text>
          <Pressable 
            onPress={() => router.push('/trend-detail')}
            style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.chartBars}>
              {getWeeklyChartData(history).map((data, idx) => {
                const chartData = getWeeklyChartData(history);
                const maxVal = Math.max(1, ...chartData.map(d => d.total));
                const heightHealthy = (data.healthy / maxVal) * 100;
                const heightSick = ((data.total - data.healthy) / maxVal) * 100;
                return (
                  <AnimatedBar 
                    key={idx}
                    healthyPct={heightHealthy}
                    sickPct={heightSick}
                    day={data.day}
                    colors={colors}
                    styles={styles}
                    index={idx}
                  />
                );
              })}
            </View>
          </Pressable>
        </FadeInView>

        {/* 4. Ensiklopedia Penyakit */}
        <FadeInView delay={300}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, flex: 1 }]}>Ensiklopedia Penyakit</Text>
            {DISEASE_DATA.length > 1 && (
              <View style={{ width: 40, height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ 
                  width: `${100 / DISEASE_DATA.length}%`, 
                  height: '100%', 
                  backgroundColor: colors.primary, 
                  borderRadius: 3,
                  marginLeft: `${(currentDiseaseIndex / DISEASE_DATA.length) * 100}%`
                }} />
              </View>
            )}
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.encyclopediaScroll} 
            contentContainerStyle={{ paddingRight: 24 }}
            snapToInterval={142}
            decelerationRate="fast"
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const maxOffset = e.nativeEvent.contentSize.width - e.nativeEvent.layoutMeasurement.width;
              if (maxOffset > 0) {
                const progress = Math.max(0, Math.min(1, x / maxOffset));
                const idx = Math.round(progress * (DISEASE_DATA.length - 1));
                if (idx !== currentDiseaseIndex) setCurrentDiseaseIndex(idx);
              }
            }}
            scrollEventThrottle={16}
          >
            {DISEASE_DATA.map((disease) => (
              <Pressable 
                key={disease.id} 
                style={[styles.diseaseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push({ pathname: '/disease-detail', params: { id: disease.id } })}
              >
                <View style={[styles.diseaseIcon, { backgroundColor: `${disease.color}20` }]}>
                  <MaterialCommunityIcons name={disease.icon as any} size={28} color={disease.color} />
                </View>
                <Text style={[styles.diseaseTitle, { color: colors.text }]}>{disease.title}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </FadeInView>



        {/* 6. Fakta Menarik (Fun Fact) */}
        <FadeInView delay={400}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Fakta Menarik</Text>
          <View style={[styles.factCard, { backgroundColor: `${colors.primary}15`, borderColor: colors.primaryMuted }]}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={28} color={colors.primary} style={{ marginRight: 16 }} />
            <View style={{ flex: 1 }}>
              <Animated.Text key={funFactIndex} entering={FadeIn.duration(400)} exiting={FadeOut.duration(400)} style={[styles.factText, { color: colors.text }]}>
                "{FUN_FACTS[funFactIndex]}"
              </Animated.Text>
            </View>
          </View>
        </FadeInView>

        {/* Tips Perawatan Harian (Original) */}
        <FadeInView delay={450}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Artikel Edukasi</Text>
          <Pressable 
            style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: '/tip-detail', params: { id: TIPS_DATA[currentTipIndex].id }})}
          >
            <MaterialCommunityIcons name="water-percent" size={28} color="#3B82F6" style={{marginRight: 16}} />
            <View style={{flex: 1}}>
              <Animated.View key={currentTipIndex} entering={FadeIn.duration(400)} exiting={FadeOut.duration(400)}>
                <Text style={[styles.tipsTitle, { color: colors.text }]}>{TIPS_DATA[currentTipIndex].title}</Text>
                <Text style={[styles.tipsDesc, { color: colors.textMuted }]}>
                  {TIPS_DATA[currentTipIndex].desc}
                </Text>
              </Animated.View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} style={{ marginLeft: 8 }} />
          </Pressable>
        </FadeInView>

        {/* Recent Activity Placeholder */}
        <FadeInView delay={500}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Riwayat Pindaian</Text>
            <Pressable onPress={() => router.push('/history')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Lihat Semua</Text>
            </Pressable>
          </View>
        </FadeInView>
        
        {history.slice(0, 5).map((item, index) => {
          const isHealthy = item.result === 'SEHAT';
          return (
            <FadeInView delay={550 + (index * 100)} key={item.id}>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  greeting: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  scanCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    position: 'relative',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  scanCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  scanIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scanTextContainer: {
    flex: 1,
  },
  scanTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#FFF',
    marginBottom: 6,
  },
  scanDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 20,
  },
  scanDecoration1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -50,
    right: -30,
    zIndex: 1,
  },
  scanDecoration2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    bottom: -30,
    right: 50,
    zIndex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
  },
  statNumber: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  taskContainer: {
    marginBottom: 32,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  taskText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    marginLeft: 12,
  },
  waterParamsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  waterBox: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  waterVal: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    marginTop: 6,
    marginBottom: 2,
  },
  waterLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  chartCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 32,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 120,
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    width: 14,
    height: 90,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 7,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  barHealthy: {
    width: 14,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
  },
  barSick: {
    width: 14,
    position: 'absolute',
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  barLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  encyclopediaScroll: {
    marginBottom: 32,
    marginHorizontal: -24,
    paddingLeft: 24,
  },
  diseaseCard: {
    width: 130,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 12,
    alignItems: 'center',
  },
  diseaseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  diseaseTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    textAlign: 'center',
  },
  aquariumContainer: {
    marginBottom: 32,
  },
  fishCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 10,
  },
  fishAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  fishInfo: {
    flex: 1,
  },
  fishName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    marginBottom: 4,
  },
  fishStatus: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  factCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 32,
  },
  factText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    marginBottom: 16,
  },
  seeAll: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  tipsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
  },
  tipsTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    marginBottom: 4,
  },
  tipsDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
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
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
  },
  deleteAction: {
    backgroundColor: '#F9423A',
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    height: 80,
    borderRadius: 16,
    marginBottom: 16,
    marginLeft: 10,
  }
});
