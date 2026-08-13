import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { ASAHI_WHEEL_VALUES } from '@/utils/asahi-wheel';

const ROW_HEIGHT = 64;
const VISIBLE_ROWS = 3;

type SlotReelProps = {
  targetValue: number | null;
  spinToken: number; // bump to trigger a new spin — targetValue alone can repeat between spins
  rotations: number;
  durationMs: number;
  onLanded?: () => void;
};

export function SlotReel({ targetValue, spinToken, rotations, durationMs, onLanded }: SlotReelProps) {
  const translateY = useRef(new Animated.Value(0)).current;

  const { strip, targetStripIndex } = useMemo(() => {
    const n = ASAHI_WHEEL_VALUES.length;
    const valueIndex = targetValue !== null ? Math.max(ASAHI_WHEEL_VALUES.indexOf(targetValue), 0) : 0;
    const index = rotations * n + valueIndex;
    // +1 extra row so the bottom window row is never blank at rest.
    const length = index + 2;
    return {
      strip: Array.from({ length }, (_, k) => ASAHI_WHEEL_VALUES[k % n]),
      targetStripIndex: index,
    };
  }, [targetValue, rotations]);

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
    <View style={styles.window}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        {strip.map((value, index) => (
          <View key={index} style={styles.row}>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  window: {
    width: 72,
    height: ROW_HEIGHT * VISIBLE_ROWS,
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
  },
  value: {
    fontFamily: Fonts.serif,
    fontSize: 30,
    color: Colors.light.text,
  },
});
