/**
 * Tab layout — defines the two primary tabs: "Birthdays" and "Add Birthday".
 *
 * In Expo Router, every .tsx file inside `(tabs)/` is automatically
 * registered as a navigable screen.  The <Tabs> component here controls
 * which of those screens actually appear as tab-bar items, and what each
 * tab looks like (icon, label, header title).
 *
 * The parentheses in "(tabs)" are an Expo Router convention called a "route
 * group" — the folder name is NOT part of the URL path.  So the Home screen
 * is still reachable at "/" (or "/(tabs)/index") and Add at "/add".
 */

import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        tabBarButton: HapticTab,
        tabBarStyle: { backgroundColor: Colors[colorScheme ?? 'light'].tabBarBackground },
        headerStyle: { backgroundColor: Colors[colorScheme ?? 'light'].headerBackground },
        headerTintColor: Colors[colorScheme ?? 'light'].text,
      }}>
      {/*
       * "index" matches the file `app/(tabs)/index.tsx`.
       * This is the Home screen showing all upcoming birthdays.
       */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Birthdays',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gift.fill" color={color} />,
        }}
      />

      {/*
       * "add" matches the file `app/(tabs)/add.tsx`.
       * This is the form for creating a new birthday entry.
       */}
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add Birthday',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="plus.circle.fill" color={color} />,
        }}
      />

      {/*
       * "group-gifts" matches `app/(tabs)/group-gifts.tsx`.
       * AF3 — Group Gift Organizer tab.
       */}
      <Tabs.Screen
        name="group-gifts"
        options={{
          title: 'Group Gifts',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.2.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
