import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isInitialized) SplashScreen.hideAsync();
  }, [isInitialized]);

  if (!isInitialized) return null;

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.light.background },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Details' }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
