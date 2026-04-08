/**
 * Home Screen — displays all upcoming birthdays sorted by how soon they occur.
 *
 * Key concepts used here:
 *
 *  • useFocusEffect  — a React Navigation hook that runs a callback every
 *    time this screen comes into focus (i.e., becomes visible).  We use it
 *    instead of useEffect so the list refreshes automatically after the user
 *    adds or edits a birthday and navigates back here.
 *
 *  • FlatList  — React Native's high-performance scrollable list. Unlike
 *    mapping array items into a <View>, FlatList only renders items currently
 *    visible on screen, which keeps the app fast with large datasets.
 *
 *  • router.push  — from expo-router; navigates to a new screen by pushing
 *    it onto the navigation stack.
 */

import { useFocusEffect, router } from 'expo-router';
import React, { useState, useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BirthdayEntry } from '@/types/birthday';
import { daysUntilBirthday, daysUntilLabel, formatBirthdayDate } from '@/utils/dateUtils';
import { loadEntries } from '@/utils/storage';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // The sorted list of birthday entries shown in the FlatList
  const [entries, setEntries] = useState<BirthdayEntry[]>([]);

  // True when AsyncStorage fails on load — we show an error banner instead
  // of crashing the app
  const [loadError, setLoadError] = useState(false);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  /**
   * useFocusEffect runs `loadBirthdays` every time this screen becomes the
   * active screen (e.g., when the user taps the Home tab or navigates back
   * from the Add/Edit screen).
   *
   * The `useCallback` wrapper is required by useFocusEffect — it prevents
   * the callback from being re-created on every render, which would cause
   * an infinite loop.
   *
   * The returned cleanup function sets `active = false` so that if the
   * component unmounts before the async load finishes, we don't try to call
   * setState on an unmounted component.
   */
  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadBirthdays = async () => {
        try {
          const data = await loadEntries();

          if (!active) return;

          // Sort entries so the birthday with the fewest days remaining
          // appears first (ascending order of daysUntilBirthday)
          const sorted = [...data].sort(
            (a, b) => daysUntilBirthday(a.birthday) - daysUntilBirthday(b.birthday),
          );
          setEntries(sorted);
          setLoadError(false);
        } catch (err) {
          console.error('[HomeScreen] Failed to load entries:', err);
          if (!active) return;
          // Don't crash: show an error banner and an empty list
          setLoadError(true);
          setEntries([]);
        }
      };

      loadBirthdays();

      // Cleanup function — called when the screen loses focus
      return () => {
        active = false;
      };
    }, []),
  );

  // -------------------------------------------------------------------------
  // Rendering individual birthday cards
  // -------------------------------------------------------------------------

  /**
   * renderItem is called by FlatList for each entry in the array.
   * Each card shows the person's name, the human-readable birthday date,
   * how many days away it is, and optional notes.
   * Tapping the card navigates to the Edit screen for that entry.
   */
  const renderItem = ({ item }: { item: BirthdayEntry }) => {
    const label = daysUntilLabel(item.birthday);             // e.g. "3 days away"
    const formattedDate = formatBirthdayDate(item.birthday); // e.g. "April 8"
    const isToday = daysUntilBirthday(item.birthday) === 0;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.background,
            // Highlight today's birthdays with the theme tint colour as a border
            borderColor: isToday ? colors.tint : '#E0E0E0',
            borderWidth: isToday ? 2 : 1,
          },
        ]}
        // router.push navigates to the dynamic Edit route, passing the id
        // in the URL path.  Expo Router provides it as a param to that screen.
        onPress={() => router.push(`/edit/${item.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, birthday ${formattedDate}, ${label}`}
      >
        {/* Top row: name on the left, days-until badge on the right */}
        <View style={styles.cardHeader}>
          <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.cardDays, { color: isToday ? colors.tint : colors.icon }]}>
            {label}
          </Text>
        </View>

        {/* Birthday formatted as "Month Day" */}
        <Text style={[styles.cardDate, { color: colors.icon }]}>{formattedDate}</Text>

        {/*
         * Only render the notes section when the notes string is non-empty.
         * `item.notes.trim()` strips leading/trailing whitespace before the
         * length check so a string of only spaces also hides the section.
         */}
        {item.notes.trim().length > 0 && (
          <Text style={[styles.cardNotes, { color: colors.icon }]} numberOfLines={2}>
            {item.notes}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Error banner — shown only when AsyncStorage read fails */}
      {loadError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            ⚠️ Could not load saved birthdays. Please restart the app.
          </Text>
        </View>
      )}

      {/*
       * FlatList renders the sorted birthday cards.
       *
       * keyExtractor tells FlatList which field to use as a unique key for
       * each item — this is how React efficiently updates only the items
       * that changed when the list re-renders.
       *
       * ListEmptyComponent is rendered automatically when `data` is empty.
       * contentContainerStyle gets extra flex-centering when empty so the
       * message appears in the middle of the screen.
       */}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={
          entries.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No birthdays yet!</Text>
            <Text style={[styles.emptySubtitle, { color: colors.icon }]}>
              Tap the{' '}
              <Text style={{ fontWeight: '700' }}>Add Birthday</Text>
              {' '}tab below to add your first entry.
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
// StyleSheet.create() is React Native's equivalent of CSS classes.
// All sizes are in "density-independent pixels" (dp) — the same number looks
// roughly the same physical size on all screen densities.

const styles = StyleSheet.create({
  container: {
    flex: 1, // Take up all available vertical space
  },

  // Padding around the cards in the list
  listContent: {
    padding: 16,
    gap: 12, // vertical space between cards
  },

  // When the list is empty, centre the content vertically
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 32,
  },

  // ---- Birthday card -------------------------------------------------------
  card: {
    borderRadius: 12,
    padding: 16,
    // Shadow on iOS (Android uses `elevation`)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',           // Line name and days badge side-by-side
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,         // Allows the name to wrap; the badge stays on the right
    marginRight: 8,
  },
  cardDays: {
    fontSize: 13,
    fontWeight: '500',
  },
  cardDate: {
    fontSize: 14,
    marginBottom: 6,
  },
  cardNotes: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },

  // ---- Empty state ---------------------------------------------------------
  emptyState: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ---- Error banner --------------------------------------------------------
  errorBanner: {
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderBottomWidth: 1,
    borderBottomColor: '#FFECB5',
  },
  errorBannerText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
  },
});
