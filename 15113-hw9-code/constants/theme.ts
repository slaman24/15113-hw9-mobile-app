/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1C103C',
    background: '#FDFAFF',
    tint: '#7C3AED',
    icon: '#7B6BA8',
    tabIconDefault: '#9B8EC0',
    tabIconSelected: '#7C3AED',
    cardBackground: '#FFFFFF',
    headerBackground: '#F3EDFF',
    tabBarBackground: '#F3EDFF',
    cardAccents: ['#FFE4EE', '#EDE4FF', '#E4F9EC', '#FFF5DD', '#E0F0FF'] as string[],
  },
  dark: {
    text: '#EDE9FF',
    background: '#0F0B1A',
    tint: '#A78BFA',
    icon: '#9580C8',
    tabIconDefault: '#6B5A90',
    tabIconSelected: '#A78BFA',
    cardBackground: '#1E1840',
    headerBackground: '#1A1535',
    tabBarBackground: '#1A1535',
    cardAccents: ['#2D0E1A', '#1E0E40', '#082A14', '#2A1F08', '#0E1E35'] as string[],
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
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
