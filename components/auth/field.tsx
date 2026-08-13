import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

type AuthFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  helperText?: string;
  isPassword?: boolean;
};

export function AuthField({ label, helperText, isPassword, ...inputProps }: AuthFieldProps) {
  const [hidden, setHidden] = useState(isPassword);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          {...inputProps}
          secureTextEntry={hidden}
          placeholderTextColor={Colors.light.textMuted}
          style={styles.input}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <MaterialCommunityIcons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={Colors.light.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.line,
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 15,
    padding: 0,
  },
  helper: {
    color: Colors.light.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
});
