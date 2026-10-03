import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useDatabase } from '../context/DatabaseContext';
import FadeInView from '../components/FadeInView';

type FormType = 'aquarium' | 'task';

export default function AddDataScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, colorScheme } = useTheme();
  const { addAquariumFish, addTask, aquarium } = useDatabase();
  
  const [activeForm, setActiveForm] = useState<'aquarium' | 'task' | null>(null);

  // States for Aquarium Form
  const [newAqName, setNewAqName] = useState('');
  
  // States for Task Form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskAqId, setNewTaskAqId] = useState(aquarium.length > 0 ? aquarium[0].id : '');

  // Time Picker Modal States
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [tempHour, setTempHour] = useState('08');
  const [tempMinute, setTempMinute] = useState('00');

  // Modal State
  const [successPopupVisible, setSuccessPopupVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleAddAquarium = async () => {
    if (newAqName.trim() === '') return;
    await addAquariumFish({
      name: newAqName,
      status: 'Sehat',
      // Simpan sebagai string key, bukan hasil require(), agar aman diserialisasi
      // ke Firebase Realtime Database dan bisa diselesaikan ulang lewat resolveImage().
      image: 'healthy_halfmoon'
    });
    setNewAqName('');
    setSuccessMessage('Akuarium baru Anda telah dibuat beserta jadwal tugas hariannya.');
    setSuccessPopupVisible(true);
  };

  const handleAddTask = async () => {
    if (newTaskTitle.trim() === '' || newTaskTime.trim() === '' || newTaskAqId === '') return;
    await addTask({
      title: newTaskTitle,
      time: newTaskTime,
      aquariumId: newTaskAqId,
      completed: false
    });
    setNewTaskTitle('');
    setNewTaskTime('');
    setSuccessMessage('Tugas harian baru telah ditambahkan ke akuarium Anda.');
    setSuccessPopupVisible(true);
  };

  const handleSuccessOk = () => {
    setSuccessPopupVisible(false);
    router.replace('/(tabs)');
  };

  const incrementHour = () => {
    setTempHour(prev => {
      const next = (parseInt(prev) + 1) % 24;
      return next < 10 ? `0${next}` : `${next}`;
    });
  };

  const decrementHour = () => {
    setTempHour(prev => {
      const next = parseInt(prev) - 1 < 0 ? 23 : parseInt(prev) - 1;
      return next < 10 ? `0${next}` : `${next}`;
    });
  };

  const incrementMinute = () => {
    setTempMinute(prev => {
      const next = (parseInt(prev) + 15) % 60;
      return next < 10 ? `0${next}` : `${next}`;
    });
  };

  const decrementMinute = () => {
    setTempMinute(prev => {
      const next = parseInt(prev) - 15 < 0 ? 45 : parseInt(prev) - 15;
      return next < 10 ? `0${next}` : `${next}`;
    });
  };

  const handleSaveTime = () => {
    setNewTaskTime(`${tempHour}:${tempMinute} WIB`);
    setTimePickerVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* App Bar */}
      <View style={[styles.appBar, { paddingTop: insets.top + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable 
          onPress={() => {
            if (activeForm !== null) {
              setActiveForm(null);
            } else {
              router.back();
            }
          }} 
          style={styles.backBtnHeader} 
          hitSlop={10}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.appBarTitle, { color: colors.text }]}>
          {activeForm === 'aquarium' ? 'Data Akuarium' : activeForm === 'task' ? 'Tugas Harian' : 'Tambah Data'}
        </Text>
        <View style={styles.backBtnHeader} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {activeForm === null ? (
          <FadeInView delay={0}>
            <View style={{ gap: 16 }}>
              <Pressable 
                onPress={() => setActiveForm('aquarium')}
                style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', padding: 20 }]}
              >
                <View style={[styles.iconHeader, { backgroundColor: 'rgba(59, 130, 246, 0.15)', marginBottom: 0, marginRight: 16 }]}>
                  <MaterialCommunityIcons name="fishbowl-outline" size={28} color="#3B82F6" />
                </View>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.text, flex: 1 }}>Tambah Data Akuarium</Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
              </Pressable>

              <Pressable 
                onPress={() => {
                  if (aquarium.length > 0 && newTaskAqId === '') {
                    setNewTaskAqId(aquarium[0].id);
                  }
                  setActiveForm('task');
                }}
                style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', padding: 20 }]}
              >
                <View style={[styles.iconHeader, { backgroundColor: 'rgba(16, 185, 129, 0.15)', marginBottom: 0, marginRight: 16 }]}>
                  <MaterialCommunityIcons name="clipboard-text-outline" size={28} color="#10B981" />
                </View>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.text, flex: 1 }}>Tambah Tugas Perawatan</Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
              </Pressable>
            </View>
          </FadeInView>
        ) : activeForm === 'aquarium' ? (
          <FadeInView delay={0}>
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 24 }]}>
              <View style={[styles.iconHeader, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <MaterialCommunityIcons name="fishbowl-outline" size={32} color="#3B82F6" />
              </View>
              <Text style={[styles.formTitle, { color: colors.text }]}>Akuarium Baru</Text>
              
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Nama Akuarium / Ikan</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colorScheme === 'dark' ? '#0F172A' : '#F8FAFC' }]}
                placeholder="Misal: Si Merah"
                placeholderTextColor={colors.textMuted}
                value={newAqName}
                onChangeText={setNewAqName}
              />
              
              <Pressable 
                onPress={handleAddAquarium} 
                style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: newAqName.trim() === '' ? 0.5 : 1 }]}
                disabled={newAqName.trim() === ''}
              >
                <Text style={styles.saveBtnText}>Simpan Akuarium</Text>
              </Pressable>
            </View>
          </FadeInView>
        ) : (
          <FadeInView delay={0}>
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.iconHeader, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={32} color="#10B981" />
              </View>
              <Text style={[styles.formTitle, { color: colors.text }]}>Tugas Perawatan Baru</Text>
              
              {aquarium.length === 0 ? (
                <View style={{ alignItems: 'center', marginVertical: 24 }}>
                  <Text style={{ color: '#F9423A', fontFamily: 'Inter_500Medium', textAlign: 'center' }}>Harap buat akuarium terlebih dahulu sebelum membuat tugas!</Text>
                </View>
              ) : (
                <View style={{ width: '100%' }}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Nama Tugas</Text>
                  <TextInput
                    style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colorScheme === 'dark' ? '#0F172A' : '#F8FAFC' }]}
                    placeholder="Misal: Kuras Total"
                    placeholderTextColor={colors.textMuted}
                    value={newTaskTitle}
                    onChangeText={setNewTaskTitle}
                  />

                  <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 16 }]}>Waktu / Frekuensi</Text>
                  <Pressable 
                    onPress={() => setTimePickerVisible(true)}
                    style={[styles.textInput, { borderColor: colors.border, backgroundColor: colorScheme === 'dark' ? '#0F172A' : '#F8FAFC', justifyContent: 'center' }]}
                  >
                    <Text style={{ fontFamily: 'Inter_500Medium', color: newTaskTime ? colors.text : colors.textMuted }}>
                      {newTaskTime || "Pilih Jam (Misal: 08:00 WIB)"}
                    </Text>
                  </Pressable>

                  <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 16 }]}>Tugaskan ke Akuarium</Text>
                  <ScrollView style={{ maxHeight: 200, width: '100%', marginTop: 8 }} nestedScrollEnabled>
                    {aquarium.map(aq => (
                      <Pressable 
                        key={aq.id} 
                        style={[
                          styles.aqPickerItem, 
                          { borderColor: newTaskAqId === aq.id ? colors.primary : colors.border,
                            backgroundColor: newTaskAqId === aq.id ? colors.primaryMuted : 'transparent' }
                        ]}
                        onPress={() => setNewTaskAqId(aq.id)}
                      >
                        <Text style={{ fontFamily: newTaskAqId === aq.id ? 'Inter_600SemiBold' : 'Inter_400Regular', color: newTaskAqId === aq.id ? colors.primary : colors.text }}>
                          {aq.name}
                        </Text>
                        {newTaskAqId === aq.id && <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />}
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Pressable 
                    onPress={handleAddTask} 
                    style={[styles.saveBtn, { backgroundColor: '#10B981', opacity: (newTaskTitle.trim() === '' || newTaskTime.trim() === '') ? 0.5 : 1 }]}
                    disabled={newTaskTitle.trim() === '' || newTaskTime.trim() === ''}
                  >
                    <Text style={styles.saveBtnText}>Simpan Tugas</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </FadeInView>
        )}
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={successPopupVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#1E293B' : colors.card }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <MaterialCommunityIcons name="check-circle" size={48} color="#10B981" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Berhasil Ditambahkan!</Text>
            <Text style={[styles.modalMessage, { color: colors.textMuted, marginBottom: 24 }]}>
              {successMessage}
            </Text>
            
            <View style={{ width: '100%' }}>
              <Pressable 
                onPress={handleSuccessOk} 
                style={[styles.saveBtn, { backgroundColor: '#10B981', marginTop: 0 }]}
              >
                <Text style={styles.saveBtnText}>Oke, Mengerti</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={timePickerVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#1E293B' : colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 24 }]}>Pilih Jam Tugas</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              {/* Hour Selection */}
              <View style={{ alignItems: 'center' }}>
                <Pressable onPress={incrementHour} hitSlop={10} style={{ padding: 8 }}>
                  <MaterialCommunityIcons name="chevron-up" size={40} color={colors.primary} />
                </Pressable>
                <View style={{ backgroundColor: colorScheme === 'dark' ? '#0F172A' : '#F8FAFC', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginVertical: 8 }}>
                  <Text style={{ fontSize: 36, fontFamily: 'Inter_700Bold', color: colors.text }}>{tempHour}</Text>
                </View>
                <Pressable onPress={decrementHour} hitSlop={10} style={{ padding: 8 }}>
                  <MaterialCommunityIcons name="chevron-down" size={40} color={colors.primary} />
                </Pressable>
              </View>

              <Text style={{ fontSize: 36, fontFamily: 'Inter_700Bold', color: colors.text, marginHorizontal: 16, paddingBottom: 16 }}>:</Text>
              
              {/* Minute Selection */}
              <View style={{ alignItems: 'center' }}>
                <Pressable onPress={incrementMinute} hitSlop={10} style={{ padding: 8 }}>
                  <MaterialCommunityIcons name="chevron-up" size={40} color={colors.primary} />
                </Pressable>
                <View style={{ backgroundColor: colorScheme === 'dark' ? '#0F172A' : '#F8FAFC', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginVertical: 8 }}>
                  <Text style={{ fontSize: 36, fontFamily: 'Inter_700Bold', color: colors.text }}>{tempMinute}</Text>
                </View>
                <Pressable onPress={decrementMinute} hitSlop={10} style={{ padding: 8 }}>
                  <MaterialCommunityIcons name="chevron-down" size={40} color={colors.primary} />
                </Pressable>
              </View>
            </View>

            <View style={{ flexDirection: 'row', width: '100%' }}>
              <Pressable 
                onPress={() => setTimePickerVisible(false)} 
                style={[styles.saveBtn, { backgroundColor: 'rgba(0,0,0,0.05)', flex: 1, marginRight: 8 }]}
              >
                <Text style={[styles.saveBtnText, { color: colors.text }]}>Batal</Text>
              </Pressable>
              <Pressable 
                onPress={handleSaveTime} 
                style={[styles.saveBtn, { backgroundColor: colors.primary, flex: 1, marginLeft: 8 }]}
              >
                <Text style={styles.saveBtnText}>Simpan Jam</Text>
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  formCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconHeader: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    marginBottom: 24,
  },
  inputLabel: {
    width: '100%',
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    marginBottom: 8,
  },
  textInput: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    marginBottom: 20,
  },
  aqPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  saveBtn: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFF',
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
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
});
