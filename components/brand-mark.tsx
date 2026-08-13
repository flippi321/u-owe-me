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
        <Text style={styles.copyLine}>You Owe Me</Text>
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
    width: 64,
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 248, 239, 0.35)',
  },
  lineTop: {
    color: Colors.light.accent,
    fontFamily: Fonts.serif,
    fontSize: 16,
    lineHeight: 16,
    letterSpacing: 1.5,
    marginBottom: 2,
    textAlign: 'center',
  },
  lineBottom: {
    color: Colors.light.accent,
    fontFamily: Fonts.serif,
    fontSize: 16,
    lineHeight: 16,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  copyWrap: {
    height: 64,
    justifyContent: 'center',
    marginLeft: 10,
  },
  copyLine: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 18,
    lineHeight: 18,
    letterSpacing: 0.8,
  },
});