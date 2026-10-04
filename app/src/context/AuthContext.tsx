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
  updateProfile as firebaseUpdateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { ref, get, set, update } from 'firebase/database';
import { Alert } from 'react-native';

type User = {
  uid: string;
  username: string;
  name?: string;
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
  const isRegisteringRef = React.useRef(false);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      console.warn("⚠️ Peringatan: Firebase Config masih menggunakan API Key simulasi. Silakan ubah di config/firebase.ts");
      setIsInitializing(false);
      return;
    }

    // Dengarkan perubahan status login dari Firebase
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      // Jika sedang dalam proses pendaftaran, abaikan event auth sementara
      if (isRegisteringRef.current) {
        return;
      }

      if (firebaseUser) {
        try {
          // Ambil data profil dari Realtime Database
          const userDocRef = ref(db, 'users/' + firebaseUser.uid);
          const userDoc = await get(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.val();
            const uname = data.username || data.name || firebaseUser.displayName || 'Pengguna';
            setUser({
              uid: firebaseUser.uid,
              username: uname,
              name: uname,
              fullname: data.fullname || firebaseUser.displayName || uname || 'Pengguna',
              firstname: data.firstname || '',
              lastname: data.lastname || '',
              email: firebaseUser.email || '',
              photoURL: data.photoURL || '',
              themePreference: data.themePreference || 'light',
            });

            // Sinkronkan username ke usernames/ agar akun lama juga bisa login pakai username
            const syncUname = data.username || data.name;
            if (syncUname && firebaseUser.email) {
              const cleanUname = String(syncUname).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
              if (cleanUname) {
                set(ref(db, `usernames/${cleanUname}`), firebaseUser.email.toLowerCase()).catch(() => {});
              }
            }
          } else {
            // Jika sedang dalam proses register, jangan buat profil default
            if (isRegisteringRef.current) return;

            // Dokumen profil belum ada (mis. akun dibuat saat rules masih
            // terkunci) -> buat otomatis (self-heal) dengan data dasar.
            const displayName = firebaseUser.displayName || 'Pengguna';
            const defaultProfile = {
              username: displayName,
              name: displayName,
              firstname: '',
              lastname: '',
              fullname: displayName,
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
              username: displayName,
              name: displayName,
              fullname: displayName,
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
            username: 'Pengguna',
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

  const login = async (identifier: string, pass: string) => {
    if (!isFirebaseConfigured) {
      Alert.alert("Firebase Belum Dikonfigurasi", "Silakan masukkan kunci API Firebase Anda di file config/firebase.ts terlebih dahulu.");
      return;
    }
    try {
      setIsLoading(true);
      let emailToUse = identifier.trim().toLowerCase();
      const isEmail = emailToUse.includes('@');

      // Jika input bukan format email, cari email berdasarkan username di Realtime Database
      if (!isEmail) {
        const cleanUsername = emailToUse.replace(/[^a-z0-9_]/g, '');
        try {
          const usernameSnap = await get(ref(db, `usernames/${cleanUsername}`));
          if (usernameSnap.exists()) {
            emailToUse = String(usernameSnap.val()).trim().toLowerCase();
          } else {
            // Fallback untuk akun lama
            emailToUse = `${cleanUsername}@bettacare.local`;
          }
        } catch (_) {
          emailToUse = `${cleanUsername}@bettacare.local`;
        }
      }

      await signInWithEmailAndPassword(auth, emailToUse, pass);
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      
      let customMessage = "Terjadi kesalahan saat masuk. Silakan coba lagi.";
      if (error.code === 'auth/user-not-found') {
        customMessage = "Akun tidak ditemukan. Periksa kembali username atau email Anda.";
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        customMessage = "Username/Email atau Kata Sandi salah.";
      } else if (error.code === 'auth/invalid-email') {
        customMessage = "Format Email atau Username tidak valid.";
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
      return "Firebase Belum Dikonfigurasi.";
    }
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    try {
      setIsLoading(true);
      isRegisteringRef.current = true;

      // Cek apakah username sudah dipakai oleh pengguna lain
      if (cleanUsername) {
        try {
          const usernameCheck = await get(ref(db, `usernames/${cleanUsername}`));
          if (usernameCheck.exists()) {
            const mappedEmail = String(usernameCheck.val()).trim().toLowerCase();
            // Jika username tersebut sudah terdaftar untuk email yang BERBEDA, tolak
            if (mappedEmail && mappedEmail !== email.trim().toLowerCase()) {
              isRegisteringRef.current = false;
              setIsLoading(false);
              return "Username sudah digunakan oleh akun lain. Silakan pilih username lain.";
            }
          }
        } catch (_) {
          // Lewatkan jika rules belum mengizinkan read public
        }
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
      const newFirebaseUser = userCredential.user;

      const trimmedFirstname = firstname.trim();
      const trimmedLastname = lastname.trim();
      const fullname = trimmedLastname ? `${trimmedFirstname} ${trimmedLastname}` : trimmedFirstname;
      
      // 1. Simpan display name ke Firebase Auth user
      try {
        await firebaseUpdateProfile(newFirebaseUser, {
          displayName: fullname,
        });
      } catch (profileErr) {
        console.warn('Gagal update displayName di Firebase Auth:', profileErr);
      }

      // 2. Simpan data profil pengguna ke users/$uid di Realtime Database
      await set(ref(db, 'users/' + newFirebaseUser.uid), {
        username: username.trim(),
        name: username.trim(),
        firstname: trimmedFirstname,
        lastname: trimmedLastname,
        fullname: fullname,
        email: email.trim().toLowerCase(),
        createdAt: new Date().toISOString()
      });

      // 3. Simpan mapping username -> email untuk fitur login dengan username
      if (cleanUsername) {
        try {
          await set(ref(db, `usernames/${cleanUsername}`), email.trim().toLowerCase());
        } catch (usernameErr) {
          console.warn("Gagal menyimpan mapping username (pastikan rules di Firebase Console sudah dipublikasikan):", usernameErr);
        }
      }

      // 4. Sign out segera agar tidak otomatis masuk (auto-redirect) ke dashboard
      // Pengguna diarahkan untuk login secara sengaja menggunakan akun baru
      await firebaseSignOut(auth);
      setUser(null);
      isRegisteringRef.current = false;
      setIsLoading(false);

      return;
    } catch (error: any) {
      isRegisteringRef.current = false;
      setIsLoading(false);
      try {
        await firebaseSignOut(auth);
      } catch (_) {}
      setUser(null);

      let customMessage = "Gagal mendaftar. Silakan coba lagi.";
      if (error.code === 'auth/email-already-in-use') {
        customMessage = "Email sudah terdaftar. Silakan masuk atau gunakan email lain.";
      } else if (error.code === 'auth/invalid-email') {
        customMessage = "Format email tidak valid.";
      } else if (error.code === 'auth/weak-password') {
        customMessage = "Kata sandi terlalu lemah. Gunakan minimal 6 karakter.";
      } else if (error.code === 'auth/network-request-failed') {
        customMessage = "Koneksi internet bermasalah. Periksa jaringan Anda.";
      } else if (error.message) {
        customMessage = error.message;
      }
      return customMessage;
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
