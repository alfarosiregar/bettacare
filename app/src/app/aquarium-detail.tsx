import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useDatabase } from '../context/DatabaseContext';
import { resolveImage } from '../utils/imageResolver';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import FadeInView from '../components/FadeInView';
import Animated, { useAnimatedStyle, withTiming, Easing, useSharedValue } from 'react-native-reanimated';

const TaskRow = ({ task, isLast, colors, isDeleteMode, isSelected, onToggle, onSelect, styles }: any) => {
  const leftAnim = useSharedValue(isDeleteMode ? 0 : 1);
  const rightAnim = useSharedValue(isDeleteMode ? 1 : 0);

  React.useEffect(() => {
    leftAnim.value = withTiming(isDeleteMode ? 0 : 1, { duration: 300, easing: Easing.out(Easing.exp) });
    rightAnim.value = withTiming(isDeleteMode ? 1 : 0, { duration: 300, easing: Easing.out(Easing.exp) });
  }, [isDeleteMode]);

  const leftIconStyle = useAnimatedStyle(() => {
    return {
      opacity: leftAnim.value,
      width: leftAnim.value * 36, // 24 icon + 12 margin
      transform: [{ scale: 0.5 + (leftAnim.value * 0.5) }],
      overflow: 'hidden'
    };
  });

  const rightIconStyle = useAnimatedStyle(() => {
    return {
      opacity: rightAnim.value,
      width: rightAnim.value * 36, // 24 icon + 12 margin
      transform: [{ scale: 0.5 + (rightAnim.value * 0.5) }],
      overflow: 'hidden',
      alignItems: 'flex-end',
    };
  });

  return (
    <Pressable 
      style={[styles.taskItem, { borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : 1 }]}
      onPress={() => isDeleteMode ? onSelect() : onToggle()}
    >
      <Animated.View style={[leftIconStyle, { justifyContent: 'center' }]}>
        <MaterialCommunityIcons 
          name={task.completed ? "check-circle" : "checkbox-blank-circle-outline"} 
          size={24} 
          color={task.completed ? colors.primary : colors.textMuted} 
        />
      </Animated.View>

      <Text style={[styles.taskText, { flex: 1, color: task.completed && !isDeleteMode ? colors.textMuted : colors.text, textDecorationLine: task.completed && !isDeleteMode ? 'line-through' : 'none', marginLeft: 0 }]}>
        {task.title}
      </Text>
      
      {task.time && <Text style={[styles.taskTime, { color: colors.textMuted }]}>{task.time}</Text>}
      
      <Animated.View style={[rightIconStyle, { justifyContent: 'center' }]}>
        <MaterialCommunityIcons 
          name={isSelected ? "check-circle" : "circle-outline"} 
          size={24} 
          color={isSelected ? colors.danger : colors.textMuted} 
        />
      </Animated.View>
    </Pressable>
  );
};

export default function AquariumDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, colorScheme } = useTheme();
  const { aquarium, tasks, removeAquariumFish, toggleTask, updateAquariumName, removeTask } = useDatabase();

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTasksModalVisible, setDeleteTasksModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  // Find the specific fish
  const fish = aquarium.find(f => f.id === id);
  const fishTasks = tasks.filter(t => t.aquariumId === id);

  if (!fish) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.notFound}>
          <MaterialCommunityIcons name="fish-off" size={64} color={colors.textMuted} />
          <Text style={[styles.notFoundText, { color: colors.textMuted }]}>Akuarium tidak ditemukan.</Text>
        </View>
      </View>
    );
  }

  const handleDelete = async () => {
    await removeAquariumFish(fish.id);
    setDeleteModalVisible(false);
    router.replace('/(tabs)');
  };

  const openEditModal = () => {
    if (fish) setEditName(fish.name);
    setEditModalVisible(true);
  };

  const handleEditName = async () => {
    if (editName.trim() && fish) {
      await updateAquariumName(fish.id, editName.trim());
      setEditModalVisible(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Sticky App Bar */}
      <View style={[styles.appBar, { paddingTop: insets.top + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtnHeader} hitSlop={10}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.appBarTitle, { color: colors.text }]} numberOfLines={1}>
          {fish.name}
        </Text>
        <Pressable onPress={openEditModal} style={styles.backBtnHeader} hitSlop={10}>
          <MaterialCommunityIcons name="pencil-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Banner Section */}
        <FadeInView delay={0}>
          <View style={styles.bannerContainer}>
            <Image source={resolveImage(fish.image)} style={styles.bannerImage} />
            <View style={styles.bannerOverlay}>
              <View style={[styles.statusBadge, { backgroundColor: fish.status === 'Sehat' ? colors.primaryMuted : colors.dangerMuted }]}>
                <Text style={[styles.statusText, { color: fish.status === 'Sehat' ? colors.primary : colors.danger }]}>• {fish.status}</Text>
              </View>
            </View>
          </View>
        </FadeInView>

        {/* Tasks Section */}
        <FadeInView delay={100}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 24, marginTop: 24, marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.text, paddingHorizontal: 0, marginBottom: 0 }]}>Tugas Perawatan Harian</Text>
            {fishTasks.length > 0 && (
              <Pressable 
                onPress={() => {
                  if (isDeleteMode) {
                    if (selectedTasks.length > 0) {
                      setDeleteTasksModalVisible(true);
                    } else {
                      setIsDeleteMode(false);
                    }
                  } else {
                    setIsDeleteMode(true);
                  }
                }}
                hitSlop={10}
              >
                {isDeleteMode ? (
                  <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.danger, fontSize: 14 }}>
                    {selectedTasks.length > 0 ? `Hapus (${selectedTasks.length})` : 'Batal'}
                  </Text>
                ) : (
                  <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.danger} />
                )}
              </Pressable>
            )}
          </View>

          <View style={[styles.taskContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {fishTasks.length > 0 ? (
              fishTasks.map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  isLast={index === fishTasks.length - 1}
                  colors={colors}
                  isDeleteMode={isDeleteMode}
                  isSelected={selectedTasks.includes(task.id)}
                  onToggle={() => toggleTask(task.id, task.completed, task.title, task.aquariumId)}
                  onSelect={() => setSelectedTasks(prev => prev.includes(task.id) ? prev.filter(id => id !== task.id) : [...prev, task.id])}
                  styles={styles}
                />
              ))
            ) : (
              <Text style={{ fontFamily: 'Inter_400Regular', color: colors.textMuted, padding: 16 }}>Belum ada tugas untuk akuarium ini.</Text>
            )}
          </View>
        </FadeInView>

        {/* Delete Section */}
        <FadeInView delay={200}>
          <View style={styles.deleteSection}>
            <Text style={[styles.dangerTitle, { color: '#F9423A' }]}>Zona Bahaya</Text>
            <Text style={[styles.dangerDesc, { color: colors.textMuted }]}>
              Menghapus akuarium ini akan menghapus semua jadwal tugas harian dan data yang terkait secara permanen.
            </Text>
            <Pressable 
              style={[styles.deleteBtn, { borderColor: '#F9423A', backgroundColor: colorScheme === 'dark' ? 'rgba(249, 66, 58, 0.1)' : '#FEF2F2' }]} 
              onPress={() => setDeleteModalVisible(true)}
            >
              <Ionicons name="trash-outline" size={20} color="#F9423A" />
              <Text style={styles.deleteBtnText}>Hapus Akuarium</Text>
            </Pressable>
          </View>
        </FadeInView>

      </ScrollView>

      {/* Custom Delete Confirmation Modal */}
      <ConfirmDeleteModal
        visible={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={handleDelete}
        title="Hapus Akuarium?"
        message={`Apakah Anda yakin ingin menghapus akuarium "${fish.name}" beserta semua tugas hariannya? Tindakan ini tidak dapat dibatalkan.`}
      />

      <ConfirmDeleteModal
        visible={deleteTasksModalVisible}
        onCancel={() => setDeleteTasksModalVisible(false)}
        onConfirm={() => {
          selectedTasks.forEach(id => removeTask(id));
          setSelectedTasks([]);
          setIsDeleteMode(false);
          setDeleteTasksModalVisible(false);
        }}
        title="Hapus Tugas Perawatan?"
        message={`Apakah Anda yakin ingin menghapus ${selectedTasks.length} tugas perawatan yang dipilih? Tindakan ini tidak dapat dibatalkan.`}
      />

      {/* Edit Name Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#1E293B' : colors.card }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <MaterialCommunityIcons name="pencil" size={32} color="#3B82F6" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Ubah Nama Akuarium</Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: 'transparent' }]}
                placeholder="Masukkan nama baru"
                placeholderTextColor={colors.textMuted}
                value={editName}
                onChangeText={setEditName}
                autoFocus
              />
            </View>
            
            <View style={styles.modalActions}>
              <Pressable 
                onPress={() => setEditModalVisible(false)} 
                style={[styles.modalBtn, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', flex: 1, marginRight: 8 }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Batal</Text>
              </Pressable>
              <Pressable 
                onPress={handleEditName} 
                style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 1, marginLeft: 8, opacity: editName.trim() === '' ? 0.5 : 1 }]}
                disabled={editName.trim() === ''}
              >
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Simpan</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    zIndex: 10,
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
  scrollContent: {
    paddingBottom: 40,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    marginTop: 16,
  },
  bannerContainer: {
    width: '100%',
    height: 250,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 24,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  taskContainer: {
    marginHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  taskText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    marginLeft: 16,
    flex: 1,
  },
  taskTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  deleteSection: {
    marginHorizontal: 24,
    marginTop: 40,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F9423A',
    borderRadius: 20,
    borderStyle: 'dashed',
  },
  dangerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    marginBottom: 8,
  },
  dangerDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 22,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  deleteBtnText: {
    color: '#F9423A',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  textInput: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
  },
  modalBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
});
