import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.light.background },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Details' }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
