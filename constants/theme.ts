/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#C34A36';
const tintColorDark = '#E06A54';

export const Colors = {
  light: {
    text: '#2B201C',
    textMuted: '#6C5B52',
    background: '#F3ECDC',
    surface: '#FFF8EF',
    surfaceAlt: '#EEE2D0',
    line: '#D8C9B6',
    accent: '#C34A36',
    accentSoft: '#E8C2B6',
    sage: '#7A9A7E',
    shadow: 'rgba(67, 42, 29, 0.12)',
    tint: tintColorLight,
    icon: '#7C6B61',
    tabIconDefault: '#7C6B61',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#F8F1E8',
    textMuted: '#C9B8AA',
    background: '#17110F',
    surface: '#241B18',
    surfaceAlt: '#312420',
    line: '#45342F',
    accent: '#E06A54',
    accentSoft: '#6C4139',
    sage: '#91AA93',
    shadow: 'rgba(0, 0, 0, 0.35)',
    tint: tintColorDark,
    icon: '#C4B3A7',
    tabIconDefault: '#C4B3A7',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'System',
    serif: 'serif',
    rounded: 'System',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
