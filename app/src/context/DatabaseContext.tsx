import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../config/firebase';
import { ref, onValue, set, push, remove, query, orderByChild } from 'firebase/database';
import { useAuth } from './AuthContext';
import { HISTORY_DATA as MOCK_HISTORY } from '../constants/historyData';
import type { HistoryItem, AquariumFish, Task, MaintenanceLog } from '../types/domain';

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

    // 1. Listen to History
    const historyRef = query(ref(db, `users/${user.uid}/history`), orderByChild('createdAt'));
    const unsubHistory = onValue(historyRef, (snapshot) => {
      const data: HistoryItem[] = [];
      snapshot.forEach((childSnapshot) => {
        const val = childSnapshot.val() as HistoryItem;
        // Normalisasi image: data lama bisa berisi number hasil require() atau
        // file:// yang sudah mati — keduanya tidak render, ganti dengan string
        // kosong agar resolver menentukan placeholder.
        const image = typeof val?.image === 'string' ? val.image : '';
        data.push({ ...val, image, id: childSnapshot.key as string });
      });
      setHistory(data.reverse()); // RTDB orderByChild ascending by default
    });

    // 2. Listen to Aquarium
    const aquariumRef = ref(db, `users/${user.uid}/aquarium`);
    const unsubAquarium = onValue(aquariumRef, (snapshot) => {
      const data: AquariumFish[] = [];
      snapshot.forEach((childSnapshot) => {
        const val = childSnapshot.val() as AquariumFish;
        // Normalisasi image: data lama bisa berisi number hasil require() atau null
        // (gagal serialisasi) — ganti dengan fallback gambar default.
        const imageKey = typeof val?.image === 'string' && val.image.length > 0
          ? val.image
          : 'healthy_halfmoon';
        data.push({ ...val, image: imageKey, id: childSnapshot.key as string });
      });
      setAquarium(data);
    });

    // 3. Listen to Tasks
    const tasksRef = ref(db, `users/${user.uid}/tasks`);
    const unsubTasks = onValue(tasksRef, (snapshot) => {
      const data: Task[] = [];
      snapshot.forEach((childSnapshot) => {
        const val = childSnapshot.val() as Task;
        data.push({ ...val, id: childSnapshot.key as string });
      });

      // Jika tasks kosong (user baru), seed dengan template default.
      if (data.length === 0) {
        if (seeded) return; // cegah loop seeding ulang tiap snapshot
        seeded = true;
        const uid = user.uid;
        // Tulis semua seed secara paralel lalu update state dari hasil seed,
        // agar UI tidak menampilkan daftar kosong sampai snapshot berikutnya.
        Promise.all(
          DEFAULT_TASK_TEMPLATES.map((tpl, i) => {
            const task = { ...tpl, aquariumId: tpl.aquariumId || 'default' };
            return set(ref(db, `users/${uid}/tasks/template_${i + 1}`), task);
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
      } else {
        setTasks(data);
      }
    });

    // 4. Listen to Maintenance History
    const mHistoryRef = query(ref(db, `users/${user.uid}/maintenance_history`), orderByChild('completedAt'));
    const unsubMHistory = onValue(mHistoryRef, (snapshot) => {
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
    if (!user || !isFirebaseConfigured) {
      setHistory((prev) => [{ ...(item as HistoryItem), id: Date.now().toString() }, ...prev]);
      return;
    }
    const historyRef = ref(db, `users/${user.uid}/history`);
    const cleanItem = sanitizeForFirebase(item);
    await push(historyRef, {
      ...cleanItem,
      createdAt: new Date().toISOString()
    });
  };

  const removeHistory = async (id: string) => {
    if (!user || !isFirebaseConfigured) {
      setHistory(history.filter(h => h.id !== id));
      return;
    }
    const historyRef = ref(db, `users/${user.uid}/history/${id}`);
    await remove(historyRef);
  };

  const removeMaintenanceHistory = async (id: string) => {
    if (!user || !isFirebaseConfigured) {
      setMaintenanceHistory(maintenanceHistory.filter(h => h.id !== id));
      return;
    }
    const mHistoryRef = ref(db, `users/${user.uid}/maintenance_history/${id}`);
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
    const aquariumRef = ref(db, `users/${user.uid}/aquarium`);
    const newAquariumRef = await push(aquariumRef, fish);

    // Create default tasks in Firebase (tunggu semua selesai; id ikan sudah pasti)
    const aquariumId = newAquariumRef.key as string;
    await Promise.all(
      DEFAULT_TASK_TEMPLATES.map((task) => push(ref(db, `users/${user.uid}/tasks`), { ...task, aquariumId }))
    );
  };

  const addTask = async (task: Omit<Task, 'id'>) => {
    if (!user || !isFirebaseConfigured) {
      setTasks((prev) => [...prev, { ...task, id: `t_${Date.now()}` }]);
      return;
    }
    await push(ref(db, `users/${user.uid}/tasks`), task);
  };

  const removeAquariumFish = async (id: string) => {
    if (!user || !isFirebaseConfigured) {
      setAquarium(aquarium.filter(a => a.id !== id));
      setTasks(tasks.filter(t => t.aquariumId !== id));
      return;
    }
    // Delete fish
    const fishRef = ref(db, `users/${user.uid}/aquarium/${id}`);
    await remove(fishRef);

    // Delete associated tasks (paralel)
    const tasksToDelete = tasks.filter(t => t.aquariumId === id);
    await Promise.all(
      tasksToDelete.map(task => remove(ref(db, `users/${user.uid}/tasks/${task.id}`)))
    );
  };

  const removeTask = async (id: string) => {
    if (!user || !isFirebaseConfigured) {
      setTasks(tasks.filter(t => t.id !== id));
      return;
    }
    await remove(ref(db, `users/${user.uid}/tasks/${id}`));
  };

  const updateAquariumName = async (id: string, newName: string) => {
    if (!user || !isFirebaseConfigured) {
      setAquarium(aquarium.map(a => a.id === id ? { ...a, name: newName } : a));
      return;
    }
    await set(ref(db, `users/${user.uid}/aquarium/${id}/name`), newName);
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
          await push(ref(db, `users/${user.uid}/maintenance_history`), logItem);
        }
      }
    };

    if (!user || !isFirebaseConfigured) {
      // Mock toggle
      setTasks(tasks.map(t => t.id === id ? { ...t, completed: newStatus } : t));
      await logHistory(newStatus);
      return;
    }
    const taskRef = ref(db, `users/${user.uid}/tasks/${id}/completed`);
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
