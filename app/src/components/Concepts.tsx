import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { resolveImage } from '../utils/imageResolver';

interface ConceptProps {
  fish: any;
  tasks: any[];
  toggleTask: (id: string, currentStatus: boolean, title?: string, aquariumId?: string) => void;
  colors: any;
  colorScheme: 'light' | 'dark';
}

export const Concept2 = ({ fish, tasks, toggleTask, colors }: ConceptProps) => {
  const router = useRouter();

  if (!fish) return null;

  return (
    <View style={{ marginBottom: 20 }}>
      <Pressable 
        style={[styles.c2Card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push({ pathname: '/aquarium-detail', params: { id: fish.id }})}
      >
        {/* Left Side: Vitals */}
        <View style={styles.c2Left}>
          <Image source={resolveImage(fish.image)} style={styles.c2FishAvatar} />
          <Text style={[styles.c2FishName, { color: colors.text }]} numberOfLines={1}>{fish.name}</Text>
          <Text style={[styles.c2Status, { color: fish.status === 'Sehat' ? colors.primary : colors.danger }]}>{fish.status}</Text>
        </View>

        {/* Right Side: Scrollable Tasks */}
        <View style={styles.c2Right}>
          <Text style={[styles.c2RightTitle, { color: colors.textMuted }]}>Tugas Harian</Text>
          {tasks.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {tasks.map(task => (
                <Pressable 
                  key={task.id}
                  onPress={() => toggleTask(task.id, task.completed, task.title, task.aquariumId)}
                  style={[styles.c2TaskPill, { backgroundColor: task.completed ? colors.primaryMuted : 'rgba(0,0,0,0.05)', borderColor: task.completed ? colors.primary : colors.border }]}
                >
                  <MaterialCommunityIcons name={task.completed ? "check" : "circle-outline"} size={16} color={task.completed ? colors.primary : colors.text} style={{ marginRight: 6 }} />
                  <Text style={[styles.c2TaskPillText, { color: task.completed ? colors.primary : colors.text, textDecorationLine: task.completed ? 'line-through' : 'none' }]}>{task.title}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
             <Text style={{ fontFamily: 'Inter_400Regular', color: colors.textMuted, fontSize: 13, marginTop: 10 }}>Belum ada tugas.</Text>
          )}
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  c2Card: { borderWidth: 1, borderRadius: 20, flexDirection: 'row', paddingVertical: 16, paddingLeft: 16, minHeight: 130, width: 360, marginRight: 16 },
  c2Left: { width: 125, alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(150,150,150,0.2)', paddingRight: 16, justifyContent: 'center' },
  c2FishAvatar: { width: 75, height: 75, borderRadius: 37.5, marginBottom: 8 },
  c2FishName: { fontFamily: 'Inter_700Bold', fontSize: 12, textAlign: 'center' },
  c2Status: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginTop: 4 },
  c2Right: { flex: 1, paddingLeft: 16, justifyContent: 'center' },
  c2RightTitle: { fontFamily: 'Inter_500Medium', fontSize: 12, marginBottom: 8 },
  c2TaskPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8, borderWidth: 1 },
  c2TaskPillText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
});
