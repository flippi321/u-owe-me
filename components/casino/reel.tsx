import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

const ROW_HEIGHT = 64;
const VISIBLE_ROWS = 3;

type SlotReelProps<T> = {
  values: readonly T[];
  targetValue: T | null;
  spinToken: number; // bump to trigger a new spin — targetValue alone can repeat between spins
  rotations: number;
  durationMs: number;
  onLanded?: () => void;
  width?: number;
  fontSize?: number;
};

export function SlotReel<T extends string | number>({
  values,
  targetValue,
  spinToken,
  rotations,
  durationMs,
  onLanded,
  width = 72,
  fontSize = 30,
}: SlotReelProps<T>) {
  const translateY = useRef(new Animated.Value(0)).current;

  const { strip, targetStripIndex } = useMemo(() => {
    const n = values.length;
    const valueIndex = targetValue !== null ? Math.max(values.indexOf(targetValue), 0) : 0;
    const index = rotations * n + valueIndex;
    // +1 extra row so the bottom window row is never blank at rest.
    const length = index + 2;
    return {
      strip: Array.from({ length }, (_, k) => values[k % n]),
      targetStripIndex: index,
    };
  }, [values, targetValue, rotations]);

  useEffect(() => {
    if (spinToken === 0 || targetValue === null) return;

    translateY.setValue(0);
    const finalOffset = -(targetStripIndex - 1) * ROW_HEIGHT;

    Animated.timing(translateY, {
      toValue: finalOffset,
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onLanded?.());
    // Only spinToken should retrigger this — targetStripIndex/durationMs
    // are read fresh via closure from the same render that bumped it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken]);

  return (
    <View style={[styles.window, { width, height: ROW_HEIGHT * VISIBLE_ROWS }]}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        {strip.map((value, index) => (
          <View key={index} style={styles.row}>
            <Text style={[styles.value, { fontSize }]} numberOfLines={1} adjustsFontSizeToFit>
              {String(value)}
            </Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  window: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: Colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.light.line,
  },
  row: {
    height: ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  value: {
    fontFamily: Fonts.serif,
    color: Colors.light.text,
  },
});
