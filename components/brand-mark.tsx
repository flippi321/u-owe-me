import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

export function BrandMark() {
  return (
    <View style={styles.wrap}>
      <View style={styles.square}>
        <Text style={styles.lineTop}>U O</Text>
        <Text style={styles.lineBottom}>M E</Text>
      </View>
      <View style={styles.copyWrap}>
        <Text style={styles.copyLine}>You</Text>
        <Text style={styles.copyLine}>Owe</Text>
        <Text style={styles.copyLine}>Me</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  square: {
    width: 96,
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 248, 239, 0.35)',
  },
  lineTop: {
    color: Colors.light.accent,
    fontFamily: Fonts.serif,
    fontSize: 24,
    lineHeight: 26,
    letterSpacing: 3,
    marginBottom: 4,
    textAlign: 'center',
  },
  lineBottom: {
    color: Colors.light.accent,
    fontFamily: Fonts.serif,
    fontSize: 24,
    lineHeight: 26,
    letterSpacing: 3,
    textAlign: 'center',
  },
  copyWrap: {
    height: 96,
    justifyContent: 'center',
    marginLeft: 14,
  },
  copyLine: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 1,
  },
});