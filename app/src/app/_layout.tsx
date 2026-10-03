import { Stack } from 'expo-router';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider, useAuth, useProtectedRoute } from '../context/AuthContext';
import { DatabaseProvider } from '../context/DatabaseContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as ScreenCapture from 'expo-screen-capture';

SplashScreen.preventAutoHideAsync();

// Explicitly allow screen capture (screenshots & recording) globally
// This overrides the default Android behavior where secureTextEntry (passwords) blocks screenshots
ScreenCapture.allowScreenCaptureAsync();


function RootLayoutNav() {
  const { colorScheme, colors } = useTheme();
  const { user, isInitializing } = useAuth();
  
  useProtectedRoute(user, isInitializing);

  if (isInitializing) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="camera" />
        <Stack.Screen name="result" />
        <Stack.Screen name="history-detail" />
        <Stack.Screen name="tip-detail" />
        <Stack.Screen name="filtered-history" />
        <Stack.Screen name="disease-detail" />
        <Stack.Screen name="water-param-detail" />
        <Stack.Screen name="trend-detail" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="faq" />
        <Stack.Screen name="about" />
      </Stack>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <DatabaseProvider>
          <ThemeProvider>
            <RootLayoutNav />
          </ThemeProvider>
        </DatabaseProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
