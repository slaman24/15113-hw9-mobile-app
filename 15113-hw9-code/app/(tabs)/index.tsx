/**
 * Home Screen — displays all upcoming birthdays sorted by how soon they occur.
 *
 * AF2: adds a "List" / "Calendar" toggle and a monthly calendar grid.
 * AF1: adds a "View Wishlist" button on cards that have wishlist items.
 */

import { useFocusEffect, router } from 'expo-router';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  FlatList,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BirthdayEntry } from '@/types/birthday';
import { daysUntilBirthday, daysUntilLabel, formatBirthdayDate } from '@/utils/dateUtils';
import { consumeCelebrate } from '@/utils/celebrateFlag';
import { ensureSeeded } from '@/utils/seed';
import { loadEntries, loadGroupGifts, loadWishlistItems } from '@/utils/storage';
import Confetti from '@/components/confetti';

// Animated TouchableOpacity used for today's birthday card glow effect
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ---------------------------------------------------------------------------
// Calendar helpers
// ---------------------------------------------------------------------------

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

/** Returns month (0-indexed) and day for a birthday in a given year, applying leap-day rule. */
function birthdayMonthDay(birthdayISO: string, year: number): { month: number; day: number } {
  const parts = birthdayISO.split('-');
  const bMonth = parseInt(parts[1], 10) - 1;
  const bDay = parseInt(parts[2], 10);
  const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  if (bMonth === 1 && bDay === 29 && !isLeap(year)) {
    return { month: 2, day: 1 };
  }
  return { month: bMonth, day: bDay };
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // List vs Calendar toggle (default: List per AF2 spec)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Calendar navigation state
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedCalDay, setSelectedCalDay] = useState<number | null>(null);

  // The sorted list of birthday entries shown in the FlatList
  const [entries, setEntries] = useState<BirthdayEntry[]>([]);

  // Map of birthdayEntryId → true for entries that have at least one wishlist item
  const [wishlistMap, setWishlistMap] = useState<Record<string, boolean>>({});

  // Map of birthdayEntryId → group gift ID for open campaigns
  const [groupGiftMap, setGroupGiftMap] = useState<Record<string, string>>({});

  // True when AsyncStorage fails on load — we show an error banner instead
  // of crashing the app
  const [loadError, setLoadError] = useState(false);

  // True while the celebration confetti overlay is playing
  const [showCelebration, setShowCelebration] = useState(false);

  // Pulse animation for today's birthday card glow (0 → 1 → 0 repeatedly)
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1200, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

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

      // Check the celebrate flag synchronously — before the async load.
      // consumeCelebrate() returns true exactly once after a new birthday is saved.
      if (consumeCelebrate()) {
        setShowCelebration(true);
      }

      const loadBirthdays = async () => {
        try {
          // Seed demo data on first launch
          await ensureSeeded();

          const data = await loadEntries();
          const wishlistData = await loadWishlistItems();
          const groupGiftsData = await loadGroupGifts();

          if (!active) return;

          // Build map of entry IDs that have at least one wishlist item
          const entryIdsWithWishlists: Record<string, boolean> = {};
          for (const item of wishlistData) {
            entryIdsWithWishlists[item.birthdayEntryId] = true;
          }

          // Build map of entry IDs → group gift ID for open campaigns
          const entryToGroupGift: Record<string, string> = {};
          for (const gift of groupGiftsData) {
            if (gift.status === 'open') {
              entryToGroupGift[gift.birthdayEntryId] = gift.id;
            }
          }

          // Sort entries so the birthday with the fewest days remaining
          // appears first (ascending order of daysUntilBirthday)
          const sorted = [...data].sort(
            (a, b) => daysUntilBirthday(a.birthday) - daysUntilBirthday(b.birthday),
          );
          setEntries(sorted);
          setWishlistMap(entryIdsWithWishlists);
          setGroupGiftMap(entryToGroupGift);
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
   * how many days away it is, optional notes, and a wishlist button (AF1).
   */
  const renderItem = ({ item, index }: { item: BirthdayEntry; index: number }) => {
    const label = daysUntilLabel(item.birthday);
    const formattedDate = formatBirthdayDate(item.birthday);
    const isToday = daysUntilBirthday(item.birthday) === 0;
    const accentColor = colors.cardAccents[index % colors.cardAccents.length];
    const hasWishlist = !!wishlistMap[item.id];
    const groupGiftId = groupGiftMap[item.id];

    const glowBorderColor = isToday
      ? pulseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [colors.tint, colorScheme === 'dark' ? '#DDD6FE' : '#C4B5FD'],
        })
      : 'transparent';

    const glowShadowOpacity = isToday
      ? pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.85] })
      : 0;

    return (
      <AnimatedTouchable
        style={[
          styles.card,
          {
            backgroundColor: accentColor,
            borderColor: glowBorderColor,
            borderWidth: 2,
            shadowColor: colors.tint,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: glowShadowOpacity,
            shadowRadius: 12,
            elevation: isToday ? 8 : 2,
          },
        ]}
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

        {item.notes.trim().length > 0 && (
          <Text style={[styles.cardNotes, { color: colors.icon }]} numberOfLines={2}>
            {item.notes}
          </Text>
        )}

        {/* Birthday message button — only shown on the person's actual birthday */}
        {isToday && (
          <TouchableOpacity
            style={[styles.wishlistButton, { borderColor: colors.tint }]}
            onPress={(e) => {
              e.stopPropagation();
              Share.share({
                message: `Happy Birthday, ${item.name}! 🎂🎉 Hope your day is amazing!`,
              });
            }}
            accessibilityRole="button"
            accessibilityLabel={`Send ${item.name} a birthday message`}
          >
            <Text style={[styles.wishlistButtonText, { color: colors.tint }]}>
              🎉 Send Birthday Message
            </Text>
          </TouchableOpacity>
        )}

        {/* AF1 — "View Wishlist" button (only shown when items exist) */}
        {hasWishlist && (
          <TouchableOpacity
            style={[styles.wishlistButton, { borderColor: colors.tint, marginTop: isToday ? 6 : 10 }]}
            onPress={(e) => {
              e.stopPropagation();
              router.push(`/wishlist/${item.id}`);
            }}
            accessibilityRole="button"
            accessibilityLabel={`View ${item.name}'s wishlist`}
          >
            <Text style={[styles.wishlistButtonText, { color: colors.tint }]}>
              🎁 View Wishlist
            </Text>
          </TouchableOpacity>
        )}

        {/* AF3 — "View Group Gift" button (only shown when an open campaign exists) */}
        {groupGiftId && (
          <TouchableOpacity
            style={[styles.wishlistButton, { borderColor: colors.tint, marginTop: (isToday || hasWishlist) ? 6 : 10 }]}
            onPress={(e) => {
              e.stopPropagation();
              router.push(`/group-gift/${groupGiftId}`);
            }}
            accessibilityRole="button"
            accessibilityLabel={`View group gift for ${item.name}`}
          >
            <Text style={[styles.wishlistButtonText, { color: colors.tint }]}>
              👥 View Group Gift
            </Text>
          </TouchableOpacity>
        )}
      </AnimatedTouchable>
    );
  };

  // -------------------------------------------------------------------------
  // Calendar view helpers (AF2)
  // -------------------------------------------------------------------------

  const prevMonth = () => {
    setSelectedCalDay(null);
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else { setCalMonth((m) => m - 1); }
  };

  const nextMonth = () => {
    setSelectedCalDay(null);
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else { setCalMonth((m) => m + 1); }
  };

  const entriesOnDay = (day: number): BirthdayEntry[] =>
    entries.filter((e) => {
      const { month, day: bDay } = birthdayMonthDay(e.birthday, calYear);
      return month === calMonth && bDay === day;
    });

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const firstDay = getFirstDayOfMonth(calYear, calMonth);

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

    const todayDay =
      today.getFullYear() === calYear && today.getMonth() === calMonth
        ? today.getDate()
        : null;

    const panelEntries = selectedCalDay ? entriesOnDay(selectedCalDay) : [];

    return (
      <View>
        {/* Month navigation */}
        <View style={styles.calNav}>
          <TouchableOpacity onPress={prevMonth} accessibilityRole="button" accessibilityLabel="Previous month">
            <Text style={[styles.calNavArrow, { color: colors.tint }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.calMonthLabel, { color: colors.text }]}>
            {MONTH_NAMES[calMonth]} {calYear}
          </Text>
          <TouchableOpacity onPress={nextMonth} accessibilityRole="button" accessibilityLabel="Next month">
            <Text style={[styles.calNavArrow, { color: colors.tint }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day-of-week headers */}
        <View style={styles.calDayHeaders}>
          {DAY_LABELS.map((d) => (
            <Text key={d} style={[styles.calDayHeader, { color: colors.icon }]}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid rows */}
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.calRow}>
            {row.map((day, colIndex) => {
              if (!day) return <View key={colIndex} style={styles.calCell} />;
              const bdEntries = entriesOnDay(day);
              const hasBirthday = bdEntries.length > 0;
              const isToday = day === todayDay;
              const isSelected = day === selectedCalDay;

              return (
                <TouchableOpacity
                  key={colIndex}
                  style={[
                    styles.calCell,
                    isToday && { borderWidth: 1.5, borderColor: colors.tint, borderRadius: 8 },
                    isSelected && hasBirthday && { backgroundColor: colors.tint, borderRadius: 8 },
                  ]}
                  onPress={() => hasBirthday && setSelectedCalDay(isSelected ? null : day)}
                  disabled={!hasBirthday}
                  accessibilityRole={hasBirthday ? 'button' : 'none'}
                >
                  <Text
                    style={[
                      styles.calDayNumber,
                      {
                        color: isSelected && hasBirthday ? '#fff' : isToday ? colors.tint : colors.text,
                        fontWeight: isToday ? '700' : '400',
                      },
                    ]}
                  >
                    {day}
                  </Text>
                  {hasBirthday && (
                    <View style={[styles.calDot, { backgroundColor: isSelected ? '#fff' : colors.tint }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Birthday detail panel */}
        {selectedCalDay !== null && panelEntries.length > 0 && (
          <View style={[styles.calPanel, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.calPanelTitle, { color: colors.text }]}>
              {MONTH_NAMES[calMonth]} {selectedCalDay}
            </Text>
            {panelEntries.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={styles.calPanelRow}
                onPress={() => router.push(`/edit/${e.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${e.name}`}
              >
                <Text style={[styles.calPanelName, { color: colors.text }]}>{e.name}</Text>
                <Text style={[styles.calPanelLabel, { color: colors.tint }]}>
                  {daysUntilLabel(e.birthday)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
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

      {/* AF2 — List / Calendar toggle */}
      <View style={[styles.toggleBar, { backgroundColor: colors.headerBackground }]}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'list' && { backgroundColor: colors.tint }]}
          onPress={() => setViewMode('list')}
          accessibilityRole="button"
          accessibilityLabel="List view"
        >
          <Text style={[styles.toggleButtonText, { color: viewMode === 'list' ? '#fff' : colors.icon }]}>
            List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'calendar' && { backgroundColor: colors.tint }]}
          onPress={() => setViewMode('calendar')}
          accessibilityRole="button"
          accessibilityLabel="Calendar view"
        >
          <Text style={[styles.toggleButtonText, { color: viewMode === 'calendar' ? '#fff' : colors.icon }]}>
            Calendar
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'list' ? (
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
      ) : (
        <FlatList
          data={[null as null]}
          keyExtractor={() => 'calendar'}
          renderItem={() => renderCalendar()}
          contentContainerStyle={styles.calendarContent}
        />
      )}

      {/* Celebration overlay — plays once after a new birthday is saved */}
      <Confetti
        visible={showCelebration}
        onDone={() => setShowCelebration(false)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 32,
  },

  // ---- Birthday card -------------------------------------------------------
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
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
  wishlistButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  wishlistButtonText: {
    fontSize: 13,
    fontWeight: '600',
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
  },
  errorBannerText: {
    color: '#856404',
    fontSize: 13,
    textAlign: 'center',
  },

  // ---- List / Calendar toggle (AF2) ----------------------------------------
  toggleBar: {
    flexDirection: 'row',
    margin: 12,
    borderRadius: 10,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // ---- Calendar (AF2) ------------------------------------------------------
  calendarContent: {
    padding: 12,
  },
  calNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  calNavArrow: {
    fontSize: 28,
    fontWeight: '300',
    paddingHorizontal: 12,
  },
  calMonthLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  calDayHeaders: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calDayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 4,
  },
  calRow: {
    flexDirection: 'row',
  },
  calCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
  },
  calDayNumber: {
    fontSize: 14,
  },
  calDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
  },
  calPanel: {
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  calPanelTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  calPanelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CCC',
  },
  calPanelName: {
    fontSize: 15,
    fontWeight: '500',
  },
  calPanelLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});
