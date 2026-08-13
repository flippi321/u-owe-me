import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { BarChart, type BarChartEntry } from '@/components/statistics/bar-chart';
import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import { fetchLeaderboard } from '@/utils/leaderboard';

export default function Statistics() {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 32, 900);

  const user = useAuthStore((state) => state.user);

  const [topLenders, setTopLenders] = useState<BarChartEntry[]>([]);
  const [bottomDwellers, setBottomDwellers] = useState<BarChartEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetchLeaderboard().then((result) => {
      if (cancelled) return;
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setTopLenders(
          result.data.topLenders.map((entry) => ({
            id: entry.profile.id,
            name: entry.profile.full_name ?? entry.profile.username,
            value: entry.amount,
          }))
        );
        setBottomDwellers(
          result.data.bottomDwellers.map((entry) => ({
            id: entry.profile.id,
            name: entry.profile.full_name ?? entry.profile.username,
            value: entry.amount,
          }))
        );
        setError(null);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, { width: contentWidth }]}>
          <Text style={styles.title}>Statistics</Text>

          {!user ? (
            <View style={[styles.panel, styles.panelCentered]}>
              <Text style={styles.note}>Sign in with email to see group statistics.</Text>
            </View>
          ) : isLoading ? (
            <View style={[styles.panel, styles.panelCentered]}>
              <ActivityIndicator color={Colors.light.accent} />
            </View>
          ) : error ? (
            <View style={[styles.panel, styles.panelCentered]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <>
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Top G&apos;s</Text>
                <Text style={styles.panelSubtitle}>Lent the most overall, paid back or not.</Text>
                <BarChart entries={topLenders} barColor={Colors.light.sage} emptyLabel="Nobody has lent anything yet." />
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Bottom Dwellers</Text>
                <Text style={styles.panelSubtitle}>Owe the most overall, paid back or not.</Text>
                <BarChart
                  entries={bottomDwellers}
                  barColor={Colors.light.accent}
                  emptyLabel="Nobody owes anything right now."
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingBottom: 36,
  },
  container: {
    gap: 16,
  },
  title: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 26,
    marginBottom: 4,
  },
  panel: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
    shadowColor: Colors.light.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  panelCentered: {
    alignItems: 'center',
  },
  panelTitle: {
    alignSelf: 'flex-start',
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 20,
  },
  panelSubtitle: {
    alignSelf: 'flex-start',
    color: Colors.light.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  note: {
    color: Colors.light.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorText: {
    color: Colors.light.accent,
    fontSize: 14,
    textAlign: 'center',
  },
});
