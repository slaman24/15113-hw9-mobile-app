/**
 * Root layout — the outermost wrapper for every screen in the app.
 *
 * Expo Router uses a file-based routing system similar to Next.js.  This
 * `_layout.tsx` at the `app/` root defines a Stack navigator that contains
 * all top-level routes.  Think of a Stack as a pile of cards: navigating to
 * a new screen pushes a card on top; going back pops it off.
 *
 * ThemeProvider (from React Navigation) makes the light/dark colour theme
 * available to all navigation elements (headers, tab bars, etc.) deep in the
 * component tree automatically.
 */

import { Ionicons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { TouchableOpacity } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  // When the app is opened via a deep link to a non-tab screen (like the
  // edit screen), Expo Router still roots the back button to (tabs) so
  // pressing Back always lands you on the tabs instead of a blank screen.
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* The tab navigator lives at (tabs)/ and manages its own header */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/*
         * The Edit screen is a stack route pushed ON TOP of the tab bar.
         * headerLeft provides an explicit back button so it works reliably
         * across all platforms and navigation states.
         */}
        <Stack.Screen
          name="edit/[id]"
          options={{
            title: 'Edit Birthday',
            headerStyle: { backgroundColor: colors.headerBackground },
            headerTintColor: colors.text,
            headerLeft: () => (
              <TouchableOpacity
                onPress={() =>
                  router.canGoBack() ? router.back() : router.replace('/(tabs)')
                }
                style={{ paddingLeft: 4 }}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="chevron-back" size={26} color={colors.tint} />
              </TouchableOpacity>
            ),
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
