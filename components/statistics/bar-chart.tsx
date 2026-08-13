import { useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { formatCurrency } from '@/utils/currency';

export type BarChartEntry = {
  id: string;
  name: string;
  value: number;
};

type BarChartProps = {
  entries: BarChartEntry[];
  barColor: string;
  emptyLabel: string;
};

const CHART_HEIGHT = 140;
const MIN_BAR_WIDTH = 40;
const MAX_BAR_WIDTH = 64;
const BAR_GAP = 14;

// Plain-View bar chart (no charting lib in the project). Bar width adapts to
// the panel's measured width so the chart always fills it; once bars would
// be squeezed below a readable minimum, it switches to horizontal scrolling
// instead of shrinking further.
export function BarChart({ entries, barColor, emptyLabel }: BarChartProps) {
  const [panelWidth, setPanelWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => setPanelWidth(event.nativeEvent.layout.width);

  if (entries.length === 0) {
    return (
      <View style={styles.emptyWrap} onLayout={onLayout}>
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      </View>
    );
  }

  const maxValue = Math.max(...entries.map((entry) => entry.value));
  const naturalWidth = entries.length * (MAX_BAR_WIDTH + BAR_GAP);
  const fitsWithoutScroll = panelWidth === 0 || naturalWidth <= panelWidth;
  const barWidth = fitsWithoutScroll
    ? Math.max(MIN_BAR_WIDTH, Math.min(MAX_BAR_WIDTH, panelWidth / entries.length - BAR_GAP))
    : MAX_BAR_WIDTH;

  const bars = entries.map((entry) => {
    const height = maxValue > 0 ? Math.max(6, (entry.value / maxValue) * CHART_HEIGHT) : 6;
    return (
      <View key={entry.id} style={[styles.barColumn, { width: barWidth }]}>
        <Text style={styles.barValue} numberOfLines={1}>
          {formatCurrency(entry.value)}
        </Text>
        <View style={styles.barTrack}>
          <View style={[styles.bar, { height, width: barWidth * 0.6, backgroundColor: barColor }]} />
        </View>
        <Text style={styles.barName} numberOfLines={1}>
          {entry.name}
        </Text>
      </View>
    );
  });

  return (
    <View onLayout={onLayout}>
      {fitsWithoutScroll ? (
        <View style={styles.row}>{bars}</View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {bars}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: BAR_GAP,
    paddingTop: 8,
  },
  barColumn: {
    alignItems: 'center',
    gap: 6,
  },
  barValue: {
    color: Colors.light.textMuted,
    fontSize: 11,
  },
  barTrack: {
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    borderRadius: 8,
  },
  barName: {
    color: Colors.light.text,
    fontSize: 12,
    fontFamily: Fonts.serif,
    maxWidth: MAX_BAR_WIDTH + 20,
  },
  emptyWrap: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.light.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});
