import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

export default function TabLayout() {
  const router = useRouter();
  const { colors } = useTheme();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: colors.tabBar, borderTopColor: colors.border }],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="home-variant" size={26} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="history"
        options={{
          title: 'Riwayat',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="history" size={26} color={color} />
          ),
        }}
      />

      {/* Floating Scan Button */}
      <Tabs.Screen
        name="camera-tab"
        options={{
          title: 'Pindai',
          tabBarIcon: () => (
            <View style={[styles.scanButton, { borderColor: colors.background }]}>
              <MaterialCommunityIcons name="qrcode-scan" size={28} color="#FFF" />
            </View>
          ),
          tabBarButton: ({ ref, ...props }) => (
            <Pressable 
              {...props} 
              onPress={() => router.push('/camera')}
              style={styles.scanButtonContainer}
            >
              {props.children}
            </Pressable>
          )
        }}
      />

      <Tabs.Screen
        name="info"
        options={{
          title: 'Edukasi',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="book-open-variant" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="account-outline" size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
  },
  tabBarLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 2,
  },
  scanButtonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButton: {
    backgroundColor: '#F9423A',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -35, // Elevate above the tab bar
    shadowColor: '#F9423A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 4,
  },
});
