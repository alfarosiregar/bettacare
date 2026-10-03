import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { auth, db, isFirebaseConfigured } from '../config/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updatePassword,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { ref, get, set, update } from 'firebase/database';
import { Alert } from 'react-native';

type User = {
  uid: string;
  name: string;
  fullname?: string;
  firstname?: string;
  lastname?: string;
  email: string;
  photoURL?: string;
  themePreference?: 'light' | 'dark';
} | null;

interface AuthContextProps {
  user: User;
  login: (email: string, pass: string) => Promise<string | void>;
  register: (firstname: string, lastname: string, username: string, email: string, pass: string) => Promise<string | void>;
  updateProfile: (firstname: string, lastname: string, newPassword?: string, photoURL?: string) => Promise<void>;
  updateThemePreference: (theme: 'light' | 'dark') => Promise<void>;
  resetPassword: (email: string) => Promise<string | void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isInitializing: boolean;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  login: async () => {},
  register: async () => {},
  updateProfile: async () => {},
  updateThemePreference: async () => {},
  resetPassword: async () => {},
  logout: async () => {},
  isLoading: false,
  isInitializing: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      console.warn("⚠️ Peringatan: Firebase Config masih menggunakan API Key simulasi. Silakan ubah di config/firebase.ts");
      setIsInitializing(false);
      return;
    }

    // Dengarkan perubahan status login dari Firebase
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // Ambil data profil dari Realtime Database
          const userDocRef = ref(db, 'users/' + firebaseUser.uid);
          const userDoc = await get(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.val();
            setUser({
              uid: firebaseUser.uid,
              name: data.name || 'Pengguna',
              fullname: data.fullname || data.name || 'Pengguna',
              firstname: data.firstname || '',
              lastname: data.lastname || '',
              email: firebaseUser.email || '',
              photoURL: data.photoURL || '',
              themePreference: data.themePreference || 'light',
            });
          } else {
            // Dokumen profil belum ada (mis. akun dibuat saat rules masih
            // terkunci) -> buat otomatis (self-heal) dengan data dasar.
            const defaultProfile = {
              name: 'Pengguna',
              firstname: '',
              lastname: '',
              fullname: 'Pengguna',
              email: firebaseUser.email || '',
              createdAt: new Date().toISOString(),
            };
            try {
              await set(userDocRef, defaultProfile);
            } catch (e) {
              console.warn('Gagal membuat profil default (periksa RTDB rules):', e);
            }
            setUser({
              uid: firebaseUser.uid,
              name: 'Pengguna',
              fullname: 'Pengguna',
              firstname: '',
              lastname: '',
              email: firebaseUser.email || '',
              photoURL: '',
              themePreference: 'light',
            });
          }
        } catch (error: any) {
          console.error('Error fetching user data:', error);
          if (
            error?.code === 'permission-denied' ||
            String(error?.message || '').toLowerCase().includes('permission denied')
          ) {
            console.error(
              '🔒 RTDB rules menolak akses. Pastikan database.rules.json sudah dipublish di\n' +
              'Firebase Console > Realtime Database > Rules, lalu logout-login ulang aplikasi.'
            );
          }
          setUser({
            uid: firebaseUser.uid,
            name: 'Pengguna',
            fullname: 'Pengguna',
            firstname: '',
            lastname: '',
            email: firebaseUser.email || '',
            photoURL: '',
            themePreference: 'light',
          });
        }
      } else {
        setUser(null);
      }
      setIsInitializing(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, pass: string) => {
    if (!isFirebaseConfigured) {
      Alert.alert("Firebase Belum Dikonfigurasi", "Silakan masukkan kunci API Firebase Anda di file config/firebase.ts terlebih dahulu.");
      return;
    }
    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      setIsLoading(false);
      
      let customMessage = "Terjadi kesalahan saat masuk. Silakan coba lagi.";
      if (error.code === 'auth/user-not-found') {
        customMessage = "Username tidak ditemukan";
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        customMessage = "Username tidak ditemukan atau Password Salah";
      } else if (error.code === 'auth/invalid-email') {
        customMessage = "Format Username tidak valid";
      } else if (error.code === 'auth/too-many-requests') {
        customMessage = "Terlalu banyak percobaan masuk. Silakan coba beberapa saat lagi.";
      } else if (error.code === 'auth/network-request-failed') {
        customMessage = "Koneksi internet bermasalah. Periksa jaringan Anda.";
      }

      return customMessage;
    }
  };

  const register = async (firstname: string, lastname: string, username: string, email: string, pass: string) => {
    if (!isFirebaseConfigured) {
      Alert.alert("Firebase Belum Dikonfigurasi", "Silakan masukkan kunci API Firebase Anda di file config/firebase.ts terlebih dahulu.");
      return;
    }
    try {
      setIsLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const newFirebaseUser = userCredential.user;

      const fullname = lastname ? `${firstname} ${lastname}` : firstname;
      await set(ref(db, 'users/' + newFirebaseUser.uid), {
        name: username,
        firstname: firstname,
        lastname: lastname,
        fullname: fullname,
        email: email,
        createdAt: new Date().toISOString()
      });

      // State user akan di-update otomatis oleh onAuthStateChanged
    } catch (error: any) {
      setIsLoading(false);
      return error.message || "Gagal mendaftar.";
    }
  };

  const updateProfile = async (firstname: string, lastname: string, newPassword?: string, photoURL?: string) => {
    if (!isFirebaseConfigured) {
      throw new Error("Fitur Dinonaktifkan: Karena menggunakan konfigurasi simulasi, profil tidak dapat disimpan ke cloud.");
    }
    if (!user || !user.uid) return;
    try {
      setIsLoading(true);
      
      // Update Password first if provided
      if (newPassword && newPassword.trim() !== '') {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await updatePassword(currentUser, newPassword);
        }
      }

      const fullname = lastname ? `${firstname} ${lastname}` : firstname;
      
      const updateData: any = {
        firstname,
        lastname,
        fullname
      };

      if (photoURL !== undefined) {
        updateData.photoURL = photoURL;
      }
      
      const userRef = ref(db, 'users/' + user.uid);
      await update(userRef, updateData);

      setUser(prev => prev ? {
        ...prev,
        ...updateData
      } : null);
      
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const updateThemePreference = async (theme: 'light' | 'dark') => {
    if (!isFirebaseConfigured || !user || !user.uid) return;
    try {
      const userRef = ref(db, 'users/' + user.uid);
      await update(userRef, { themePreference: theme });
      setUser(prev => prev ? { ...prev, themePreference: theme } : null);
    } catch (error) {
      console.error("Gagal menyimpan preferensi tema:", error);
    }
  };

  const logout = async () => {
    if (!isFirebaseConfigured) {
      setUser(null);
      return;
    }
    try {
      setIsLoading(true);
      await firebaseSignOut(auth);
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert("Gagal Keluar", error.message);
    }
  };

  const resetPassword = async (email: string) => {
    if (!isFirebaseConfigured) {
      return "Firebase Belum Dikonfigurasi. Silakan masukkan kunci API Firebase Anda di file config/firebase.ts terlebih dahulu.";
    }
    try {
      setIsLoading(true);
      await sendPasswordResetEmail(auth, email);
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      let customMessage = "Gagal mengirim email reset password.";
      if (error.code === 'auth/user-not-found') {
        customMessage = "Email tidak terdaftar.";
      } else if (error.code === 'auth/invalid-email') {
        customMessage = "Format email tidak valid.";
      }
      return customMessage;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, updateProfile, updateThemePreference, resetPassword, logout, isLoading, isInitializing }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useProtectedRoute(user: User, isInitializing: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isInitializing) return;

    const inAuthGroup = segments[0] === 'login';

    if (
      !user &&
      !inAuthGroup
    ) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, segments, isInitializing]);
}
