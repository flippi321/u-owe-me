import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const TAB_ORDER = [
  { name: 'index', icon: 'house.fill', label: 'Home' },
  { name: 'statistics', icon: 'chart.bar.fill', label: 'Stats' },
  { name: 'plus', icon: 'plus', label: 'Add' },
  { name: 'special', icon: 'exclamationmark.triangle.fill', label: 'Special' },
  { name: 'profile', icon: 'person.crop.circle', label: 'Profile' },
] as const;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

export function FillTabBar({ state, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const palette = Colors[colorScheme];
  const iconSize = clamp(Math.round(width / 15.5), 22, 34);
  const centerIconSize = clamp(Math.round(iconSize * 1.1), 24, 38);
  const barHeight = clamp(Math.round(width / 6), 84, 132);
  const centerSize = clamp(Math.round(width / 5.0), 64, 108);
  const sideSpacing = clamp(Math.round(width / 70), 8, 18);
  const verticalPadding = clamp(Math.round(width / 120), 4, 10);

  return (
    <View
      style={[
        styles.shell,
        {
          height: barHeight + insets.bottom,
          paddingBottom: insets.bottom + verticalPadding,
          backgroundColor: palette.surfaceAlt,
          borderTopColor: palette.line,
        },
      ]}>
      <View style={[styles.row, { paddingHorizontal: sideSpacing }]}> 
        {TAB_ORDER.map((tab, index) => {
          const focused = state.index === index;
          const color = focused ? palette.tabIconSelected : palette.tabIconDefault;
          const isCenter = index === 2;
          const icon = tab.icon;

          return (
            <Pressable
              key={tab.name}
              style={({ pressed }) => [
                styles.slot,
                isCenter && { flex: 1.15 },
                pressed && styles.pressed,
              ]}
              onPress={() => navigation.navigate(tab.name)}
              accessibilityRole="button"
              accessibilityLabel={tab.label}>
              {isCenter ? (
                <View
                  style={[
                    styles.centerButton,
                    {
                      width: centerSize,
                      height: centerSize,
                      borderRadius: centerSize / 2,
                      backgroundColor: palette.accent,
                    },
                  ]}>
                  <IconSymbol name={icon as never} size={centerIconSize} color="#fff" />
                </View>
              ) : (
                <View style={styles.iconStack}>
                  <IconSymbol name={icon as never} size={iconSize} color={color} />
                  <Text
                    style={[
                      styles.label,
                      {
                        color,
                        fontSize: clamp(Math.round(width / 42), 10, 14),
                      },
                    ]}>
                    {tab.label}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    borderTopWidth: 1,
    justifyContent: 'flex-end',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconStack: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontFamily: Fonts.serif,
    includeFontPadding: false,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
  centerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    marginTop: -12,
  },
});
