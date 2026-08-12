import { Tabs } from 'expo-router';
import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type TabBarProps = any;

function CustomTabBar({ state, navigation }: TabBarProps & { colorScheme?: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tabIconSelected;
  const defaultColor = Colors[colorScheme].tabIconDefault;

  const routes = state.routes;

  return (
    <View style={[styles.bar, { backgroundColor: Colors[colorScheme].surfaceAlt, borderTopColor: Colors[colorScheme].line }]}> 
      <View style={styles.sideRow}>
        {/** Left two buttons (index, statistics) */}
        {routes.slice(0, 2).map((r: any, i: number) => {
          const focused = state.index === i;
          const color = focused ? tint : defaultColor;
          const iconName = i === 0 ? 'house.fill' : 'chart.bar.fill';
          return (
            <TouchableOpacity
              key={r.key}
              style={styles.tabButton}
              onPress={() => navigation.navigate(r.name)}
              accessibilityRole="button">
              <IconSymbol size={22} name={iconName} color={color} />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.centerWrap} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.centerButton, { backgroundColor: Colors[colorScheme].accent }]}
          onPress={() => navigation.navigate(routes[2].name)}
          accessibilityRole="button"
          accessibilityLabel="New">
          <Text style={styles.centerPlus}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sideRow}>
        {/** Right two buttons (about, profile) */}
        {routes.slice(3, 5).map((r: any, idx: number) => {
          const i = idx + 3;
          const focused = state.index === i;
          const color = focused ? tint : defaultColor;
          const iconName = i === 3 ? 'information.circle' : 'person.crop.circle';
          return (
            <TouchableOpacity
              key={r.key}
              style={styles.tabButton}
              onPress={() => navigation.navigate(r.name)}
              accessibilityRole="button">
              <IconSymbol size={22} name={iconName} color={color} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="statistics" options={{ title: 'Statistics' }} />
      <Tabs.Screen name="plus" options={{ title: 'Plus' }} />
      <Tabs.Screen name="about" options={{ title: 'About' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderTopWidth: 1,
  },
  sideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  tabButton: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    top: -22,
  },
  centerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  centerPlus: {
    color: '#fff',
    fontSize: 32,
    lineHeight: 34,
    fontFamily: Fonts.serif,
  },
});
