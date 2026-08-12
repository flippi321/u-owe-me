import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

export function BrandMark() {
  return (
    <View style={styles.wrap}>
      <View style={styles.square}>
        <Text style={styles.lineTop}>U O</Text>
        <Text style={styles.lineBottom}>M E</Text>
      </View>
      <View style={styles.base} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  square: {
    width: 180,
    aspectRatio: 1,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 248, 239, 0.35)',
  },
  lineTop: {
    color: Colors.light.accent,
    fontFamily: Fonts.serif,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: 6,
    marginBottom: 4,
    textAlign: 'center',
  },
  lineBottom: {
    color: Colors.light.accent,
    fontFamily: Fonts.serif,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: 6,
    textAlign: 'center',
  },
  base: {
    width: 176,
    height: 8,
    borderRadius: 999,
    backgroundColor: Colors.light.sage,
    marginTop: 18,
  },
});