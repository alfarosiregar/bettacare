import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../config/firebase';
import { ref, onValue, set, push, remove, query, orderByChild, get } from 'firebase/database';
import { useAuth } from './AuthContext';
import { HISTORY_DATA as MOCK_HISTORY } from '../constants/historyData';
import type { HistoryItem, AquariumFish, Task, MaintenanceLog } from '../types/domain';
import { formatHistoryDate } from '../utils/dateUtils';

interface DatabaseContextProps {
  history: HistoryItem[];
  aquarium: AquariumFish[];
  tasks: Task[];
  addHistory: (item: Omit<HistoryItem, 'id'>) => Promise<void>;
  removeHistory: (id: string) => Promise<void>;
  addAquariumFish: (fish: Omit<AquariumFish, 'id'>) => Promise<void>;
  removeAquariumFish: (id: string) => Promise<void>;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleTask: (id: string, currentStatus: boolean, taskTitle?: string, aquariumId?: string) => Promise<void>;
  updateAquariumName: (id: string, newName: string) => Promise<void>;
  maintenanceHistory: MaintenanceLog[];
  removeMaintenanceHistory: (id: string) => Promise<void>;
  isLoading: boolean;
}

const DatabaseContext = createContext<DatabaseContextProps>({
  history: [],
  aquarium: [],
  tasks: [],
  addHistory: async () => {},
  removeHistory: async () => {},
  addAquariumFish: async () => {},
  removeAquariumFish: async () => {},
  addTask: async () => {},
  removeTask: async () => {},
  toggleTask: async () => {},
  updateAquariumName: async () => {},
  maintenanceHistory: [],
  removeMaintenanceHistory: async () => {},
  isLoading: true,
});

export function useDatabase() {
  return useContext(DatabaseContext);
}

// Template tugas default untuk ikan baru (tanpa id: id dibuat oleh push())
const DEFAULT_TASK_TEMPLATES: Omit<Task, 'id'>[] = [
  { title: 'Ganti Air 30%', time: '08:00 WIB', completed: false, aquariumId: '' },
  { title: 'Beri Pakan Pelet', time: '12:00 WIB', completed: false, aquariumId: '' },
  { title: 'Cek Filter Air', time: '16:00 WIB', completed: false, aquariumId: '' },
];

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [history, setHistory] = useState<HistoryItem[]>(
    isFirebaseConfigured
      ? []
      : (MOCK_HISTORY as unknown as HistoryItem[]).map((h) => ({ ...h, image: String(h.image) }))
  );

  // Default aquarium data if mock (image disimpan sebagai string key,
  // diselesaikan ulang oleh resolveImage() saat dirender)
  const MOCK_AQUARIUM: AquariumFish[] = [
    { id: '1', name: 'Si Merah (Halfmoon)', status: 'Sehat', image: 'healthy_halfmoon' },
    { id: '2', name: 'Blue Rim (Plakat)', status: 'Jamur', image: 'fungus' },
  ];
  const [aquarium, setAquarium] = useState<AquariumFish[]>(isFirebaseConfigured ? [] : MOCK_AQUARIUM);

  // Default tasks if mock
  const MOCK_TASKS: Task[] = [
    { id: 't1', title: 'Ganti Air 30%', time: '08:00 WIB', completed: false, aquariumId: '1' },
    { id: 't2', title: 'Beri Pakan Pelet', time: '12:00 WIB', completed: true, aquariumId: '1' },
    { id: 't3', title: 'Cek Filter Air', time: '16:00 WIB', completed: false, aquariumId: '1' },
    { id: 't4', title: 'Beri Pakan Kutu Air', time: '07:00 WIB', completed: false, aquariumId: '2' },
    { id: 't5', title: 'Cek Suhu', time: '12:00 WIB', completed: true, aquariumId: '2' },
  ];
  const [tasks, setTasks] = useState<Task[]>(isFirebaseConfigured ? [] : MOCK_TASKS);

  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceLog[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    let seeded = false; // guard agar seeding tasks hanya berjalan sekali per mount
    let checkedHistoryMigration = false;
    let checkedAquariumMigration = false;
    let checkedTasksMigration = false;
    let checkedMHistoryMigration = false;

    // 1. Listen to History (Root path: history/$uid)
    const historyRef = query(ref(db, `history/${user.uid}`), orderByChild('createdAt'));
    const unsubHistory = onValue(historyRef, (snapshot) => {
      if (!snapshot.exists() && !checkedHistoryMigration) {
        checkedHistoryMigration = true;
        // Coba migrasi data lama dari users/$uid/history jika ada
        get(ref(db, `users/${user.uid}/history`))
          .then((legacySnap) => {
            if (legacySnap.exists()) {
              const legacyVal = legacySnap.val();
              if (legacyVal) {
                set(ref(db, `history/${user.uid}`), legacyVal)
                  .then(() => remove(ref(db, `users/${user.uid}/history`)))
                  .catch((e) => console.warn('Gagal migrasi history:', e));
              }
            }
          })
          .catch((e) => console.warn('Gagal cek legacy history:', e));
      } else {
        checkedHistoryMigration = true;
      }

      const data: HistoryItem[] = [];
      snapshot.forEach((childSnapshot) => {
        const val = childSnapshot.val() as HistoryItem;
        const image = typeof val?.image === 'string' ? val.image : '';
        const date = formatHistoryDate(val?.createdAt, val?.date);
        data.push({ ...val, date, image, id: childSnapshot.key as string });
      });
      setHistory(data.reverse()); // RTDB orderByChild ascending by default
    });

    // 2. Listen to Aquarium (Root path: aquarium/$uid)
    const aquariumRef = ref(db, `aquarium/${user.uid}`);
    const unsubAquarium = onValue(aquariumRef, (snapshot) => {
      if (!snapshot.exists() && !checkedAquariumMigration) {
        checkedAquariumMigration = true;
        // Coba migrasi data lama dari users/$uid/aquarium jika ada
        get(ref(db, `users/${user.uid}/aquarium`))
          .then((legacySnap) => {
            if (legacySnap.exists()) {
              const legacyVal = legacySnap.val();
              if (legacyVal) {
                set(ref(db, `aquarium/${user.uid}`), legacyVal)
                  .then(() => remove(ref(db, `users/${user.uid}/aquarium`)))
                  .catch((e) => console.warn('Gagal migrasi aquarium:', e));
              }
            }
          })
          .catch((e) => console.warn('Gagal cek legacy aquarium:', e));
      } else {
        checkedAquariumMigration = true;
      }

      const data: AquariumFish[] = [];
      snapshot.forEach((childSnapshot) => {
        const val = childSnapshot.val() as AquariumFish;
        const imageKey = typeof val?.image === 'string' && val.image.length > 0
          ? val.image
          : 'healthy_halfmoon';
        data.push({ ...val, image: imageKey, id: childSnapshot.key as string });
      });
      setAquarium(data);
    });

    // Helper untuk seeding default tasks
    const seedDefaultTasks = () => {
      if (seeded) return;
      seeded = true;
      const uid = user.uid;
      Promise.all(
        DEFAULT_TASK_TEMPLATES.map((tpl, i) => {
          const task = { ...tpl, aquariumId: tpl.aquariumId || 'default' };
          return set(ref(db, `tasks/${uid}/template_${i + 1}`), task);
        })
      )
        .then(() => {
          setTasks(
            DEFAULT_TASK_TEMPLATES.map((tpl, i) => ({
              ...tpl,
              aquariumId: tpl.aquariumId || 'default',
              id: `template_${i + 1}`,
            }))
          );
        })
        .catch((e) => {
          console.warn('Gagal seeding tasks default:', e);
          seeded = false;
        });
    };

    // 3. Listen to Tasks (Root path: tasks/$uid)
    const tasksRef = ref(db, `tasks/${user.uid}`);
    const unsubTasks = onValue(tasksRef, (snapshot) => {
      const data: Task[] = [];
      snapshot.forEach((childSnapshot) => {
        const val = childSnapshot.val() as Task;
        data.push({ ...val, id: childSnapshot.key as string });
      });

      if (data.length === 0) {
        if (!checkedTasksMigration) {
          checkedTasksMigration = true;
          // Cek apakah ada data tasks lama di users/$uid/tasks
          get(ref(db, `users/${user.uid}/tasks`))
            .then((legacySnap) => {
              if (legacySnap.exists()) {
                const legacyVal = legacySnap.val();
                if (legacyVal) {
                  set(ref(db, `tasks/${user.uid}`), legacyVal)
                    .then(() => remove(ref(db, `users/${user.uid}/tasks`)))
                    .catch((e) => console.warn('Gagal migrasi tasks:', e));
                  return;
                }
              }
              seedDefaultTasks();
            })
            .catch(() => {
              seedDefaultTasks();
            });
        } else {
          seedDefaultTasks();
        }
      } else {
        checkedTasksMigration = true;
        setTasks(data);
      }
    });

    // 4. Listen to Maintenance History (Root path: maintenance_history/$uid)
    const mHistoryRef = query(ref(db, `maintenance_history/${user.uid}`), orderByChild('completedAt'));
    const unsubMHistory = onValue(mHistoryRef, (snapshot) => {
      if (!snapshot.exists() && !checkedMHistoryMigration) {
        checkedMHistoryMigration = true;
        get(ref(db, `users/${user.uid}/maintenance_history`))
          .then((legacySnap) => {
            if (legacySnap.exists()) {
              const legacyVal = legacySnap.val();
              if (legacyVal) {
                set(ref(db, `maintenance_history/${user.uid}`), legacyVal)
                  .then(() => remove(ref(db, `users/${user.uid}/maintenance_history`)))
                  .catch((e) => console.warn('Gagal migrasi maintenance_history:', e));
              }
            }
          })
          .catch((e) => console.warn('Gagal cek legacy maintenance_history:', e));
      } else {
        checkedMHistoryMigration = true;
      }

      const data: MaintenanceLog[] = [];
      snapshot.forEach((childSnapshot) => {
        const val = childSnapshot.val() as MaintenanceLog;
        data.push({ ...val, id: childSnapshot.key as string });
      });
      setMaintenanceHistory(data.reverse()); // latest first
      setIsLoading(false);
    });

    return () => {
      unsubHistory();
      unsubAquarium();
      unsubTasks();
      unsubMHistory();
    };
  }, [user]);

  // Helper untuk membersihkan undefined agar Firebase RTDB tidak melempar error:
  // "Error: push failed: value argument contains undefined in property..."
  const sanitizeForFirebase = (val: any): any => {
    if (val === undefined) return null;
    if (val === null || typeof val !== 'object') return val;
    if (Array.isArray(val)) return val.map(sanitizeForFirebase);
    const res: any = {};
    for (const key of Object.keys(val)) {
      const v = val[key];
      if (v !== undefined) {
        res[key] = sanitizeForFirebase(v);
      }
    }
    return res;
  };

  // Actions
  const addHistory = async (item: Omit<HistoryItem, 'id'>) => {
    const createdAt = item.createdAt || new Date().toISOString();
    const date = item.date && item.date !== 'Hari ini' ? item.date : formatHistoryDate(createdAt);
    const enrichedItem = { ...item, date, createdAt };

    if (!user || !isFirebaseConfigured) {
      setHistory((prev) => [{ ...(enrichedItem as HistoryItem), id: Date.now().toString() }, ...prev]);
      return;
    }
    const historyRef = ref(db, `history/${user.uid}`);
    const cleanItem = sanitizeForFirebase(enrichedItem);
    await push(historyRef, cleanItem);
  };

  const removeHistory = async (id: string) => {
    if (!user || !isFirebaseConfigured) {
      setHistory(history.filter(h => h.id !== id));
      return;
    }
    const historyRef = ref(db, `history/${user.uid}/${id}`);
    await remove(historyRef);
  };

  const removeMaintenanceHistory = async (id: string) => {
    if (!user || !isFirebaseConfigured) {
      setMaintenanceHistory(maintenanceHistory.filter(h => h.id !== id));
      return;
    }
    const mHistoryRef = ref(db, `maintenance_history/${user.uid}/${id}`);
    await remove(mHistoryRef);
  };

  const addAquariumFish = async (fish: Omit<AquariumFish, 'id'>) => {
    if (!user || !isFirebaseConfigured) {
      const newFish: AquariumFish = { ...fish, id: Date.now().toString() };
      setAquarium((prev) => [...prev, newFish]);
      const newTasks: Task[] = DEFAULT_TASK_TEMPLATES.map((tpl, i) => ({
        ...tpl,
        id: `t_${Date.now()}_${i + 1}`,
        aquariumId: newFish.id,
      }));
      setTasks((prev) => [...prev, ...newTasks]);
      return;
    }
    const aquariumRef = ref(db, `aquarium/${user.uid}`);
    const newAquariumRef = await push(aquariumRef, fish);

    // Create default tasks in Firebase (tunggu semua selesai; id ikan sudah pasti)
    const aquariumId = newAquariumRef.key as string;
    await Promise.all(
      DEFAULT_TASK_TEMPLATES.map((task) => push(ref(db, `tasks/${user.uid}`), { ...task, aquariumId }))
    );
  };

  const addTask = async (task: Omit<Task, 'id'>) => {
    if (!user || !isFirebaseConfigured) {
      setTasks((prev) => [...prev, { ...task, id: `t_${Date.now()}` }]);
      return;
    }
    await push(ref(db, `tasks/${user.uid}`), task);
  };

  const removeAquariumFish = async (id: string) => {
    if (!user || !isFirebaseConfigured) {
      setAquarium(aquarium.filter(a => a.id !== id));
      setTasks(tasks.filter(t => t.aquariumId !== id));
      return;
    }
    // Delete fish
    const fishRef = ref(db, `aquarium/${user.uid}/${id}`);
    await remove(fishRef);

    // Delete associated tasks (paralel)
    const tasksToDelete = tasks.filter(t => t.aquariumId === id);
    await Promise.all(
      tasksToDelete.map(task => remove(ref(db, `tasks/${user.uid}/${task.id}`)))
    );
  };

  const removeTask = async (id: string) => {
    if (!user || !isFirebaseConfigured) {
      setTasks(tasks.filter(t => t.id !== id));
      return;
    }
    await remove(ref(db, `tasks/${user.uid}/${id}`));
  };

  const updateAquariumName = async (id: string, newName: string) => {
    if (!user || !isFirebaseConfigured) {
      setAquarium(aquarium.map(a => a.id === id ? { ...a, name: newName } : a));
      return;
    }
    await set(ref(db, `aquarium/${user.uid}/${id}/name`), newName);
  };

  const toggleTask = async (id: string, currentStatus: boolean, taskTitle?: string, aquariumId?: string) => {
    const newStatus = !currentStatus;

    // Log history if task is marked as completed
    const logHistory = async (status: boolean) => {
      if (status && taskTitle && aquariumId) {
        const logItem: Omit<MaintenanceLog, 'id'> = {
          taskId: id,
          title: taskTitle,
          aquariumId: aquariumId,
          completedAt: new Date().toISOString()
        };
        if (!user || !isFirebaseConfigured) {
          setMaintenanceHistory((prev) => [{ id: Date.now().toString(), ...logItem }, ...prev]);
        } else {
          await push(ref(db, `maintenance_history/${user.uid}`), logItem);
        }
      }
    };

    if (!user || !isFirebaseConfigured) {
      // Mock toggle
      setTasks(tasks.map(t => t.id === id ? { ...t, completed: newStatus } : t));
      await logHistory(newStatus);
      return;
    }
    const taskRef = ref(db, `tasks/${user.uid}/${id}/completed`);
    await set(taskRef, newStatus);
    await logHistory(newStatus);
  };

  return (
    <DatabaseContext.Provider value={{ 
      history, 
      aquarium, 
      tasks, 
      addHistory, 
      removeHistory,
      addAquariumFish, 
      removeAquariumFish,
      addTask, 
      removeTask, 
      toggleTask,
      updateAquariumName,
      maintenanceHistory,
      removeMaintenanceHistory,
      isLoading 
    }}>
      {children}
    </DatabaseContext.Provider>
  );
}
