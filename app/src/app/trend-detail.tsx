import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import FadeInView from '../components/FadeInView';
import { getWeeklyChartData } from '../utils/chartUtils';
import { useDatabase } from '../context/DatabaseContext';
import Animated, { useAnimatedStyle, withTiming, Easing, useSharedValue } from 'react-native-reanimated';

const AnimatedBar = ({ healthyPct, sickPct, day, colors, styles, index }: any) => {
  const anim = useSharedValue(0);

  React.useEffect(() => {
    setTimeout(() => {
      anim.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.exp) });
    }, index * 100); // 100ms stagger
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
        <Animated.View style={[styles.barSick, { backgroundColor: colors.danger }, sickStyle]} />
      </View>
      <Text style={[styles.barLabel, { color: colors.textMuted }]}>{day}</Text>
    </View>
  );
};

export default function TrendDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { history } = useDatabase();

  const weeklyData = getWeeklyChartData(history);
  const totalScans = weeklyData.reduce((acc, curr) => acc + curr.total, 0);
  const totalHealthy = weeklyData.reduce((acc, curr) => acc + curr.healthy, 0);
  const totalSick = totalScans - totalHealthy;
  const healthPercentage = Math.round((totalHealthy / totalScans) * 100);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Analisis Tren 7 Hari</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Large Chart */}
        <FadeInView delay={0}>
          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.chartHeader}>
              <MaterialCommunityIcons name="chart-bar" size={24} color={colors.primary} />
              <Text style={[styles.chartTitle, { color: colors.text }]}>Grafik Mingguan</Text>
            </View>
            
            <View style={styles.chartBars}>
              {weeklyData.map((data, idx) => {
                const maxVal = Math.max(1, ...weeklyData.map(d => d.total));
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

            <View style={styles.chartLegend}>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={[styles.legendText, { color: colors.text }]}>Sehat ({totalHealthy})</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.danger }]} /><Text style={[styles.legendText, { color: colors.text }]}>Terinfeksi ({totalSick})</Text></View>
            </View>
          </View>
        </FadeInView>

        {/* Insight Box */}
        <FadeInView delay={100}>
          <View style={[styles.insightCard, { backgroundColor: `${colors.primary}15`, borderColor: colors.primaryMuted }]}>
            <MaterialCommunityIcons name="robot-outline" size={32} color={colors.primary} style={{ marginBottom: 12 }} />
            <Text style={[styles.insightTitle, { color: colors.text }]}>Kesimpulan AI</Text>
            <Text style={[styles.insightText, { color: colors.text }]}>
              Berdasarkan pindaian selama 7 hari terakhir, tingkat kesehatan koleksi Anda berada di angka <Text style={{ fontFamily: 'Inter_700Bold', color: colors.primary }}>{healthPercentage}%</Text>. 
              {healthPercentage >= 70 
                ? ' Ini adalah indikator yang sangat baik! Pertahankan parameter air dan jadwal makan yang konsisten.'
                : ' Terlihat adanya penurunan kualitas kesehatan. Kami menyarankan Anda untuk segera mengecek kualitas air (Ammonia) dan suhu akuarium.'
              }
            </Text>
          </View>
        </FadeInView>
        
        {/* Detailed Stats */}
        <FadeInView delay={200}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Rincian Harian</Text>
          {weeklyData.map((data, index) => (
            <View key={index} style={[styles.dailyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.dailyDay, { color: colors.text }]}>{data.day === 'Sen' ? 'Senin' : data.day === 'Sel' ? 'Selasa' : data.day === 'Rab' ? 'Rabu' : data.day === 'Kam' ? 'Kamis' : data.day === 'Jum' ? 'Jumat' : data.day === 'Sab' ? 'Sabtu' : 'Minggu'}</Text>
              <View style={styles.dailyStats}>
                <View style={[styles.badge, { backgroundColor: colors.primaryMuted }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>{data.healthy} Sehat</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: colors.dangerMuted, marginLeft: 8 }]}>
                  <Text style={[styles.badgeText, { color: colors.danger }]}>{data.total - data.healthy} Sakit</Text>
                </View>
              </View>
            </View>
          ))}
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
  chartCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  chartTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 180,
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    width: 20,
    height: 140,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  barHealthy: {
    width: 20,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  barSick: {
    width: 20,
    position: 'absolute',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  barLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  insightCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 32,
  },
  insightTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    marginBottom: 8,
  },
  insightText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    marginBottom: 16,
  },
  dailyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  dailyDay: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  dailyStats: {
    flexDirection: 'row',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  }
});
