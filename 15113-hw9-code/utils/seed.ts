/**
 * Seed utility — pre-populates demo data on first launch.
 *
 * Checks a flag key in AsyncStorage.  If the flag is absent this is the
 * first launch, so we write all demo birthday entries, wishlist items, and
 * group-gift campaigns.  Subsequent launches skip this entirely.
 *
 * Fixed "seed-" prefixed IDs make cross-table references predictable without
 * needing a relational DB.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BirthdayEntry,
  GroupGift,
  GroupGiftContribution,
  WishlistItem,
} from '@/types/birthday';
import {
  addEntry,
  addGroupGift,
  addGroupGiftContribution,
  addWishlistItem,
  loadEntries,
  SEED_FLAG_KEY,
} from '@/utils/storage';

// ---------------------------------------------------------------------------
// Stable seed IDs (fixed so cross-table FKs always match)
// ---------------------------------------------------------------------------

const ID_ALEX    = 'seed-entry-alex';
const ID_JORDAN  = 'seed-entry-jordan';
const ID_TAYLOR  = 'seed-entry-taylor';
const ID_MORGAN  = 'seed-entry-morgan';
const ID_CASEY   = 'seed-entry-casey';

// ---------------------------------------------------------------------------
// Seed birthday entries (AF2 calendar demo spread across 3 months)
// ---------------------------------------------------------------------------

const SEED_ENTRIES: BirthdayEntry[] = [
  {
    id: ID_ALEX,
    name: 'Alex',
    birthday: '1990-04-22',
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: ID_JORDAN,
    name: 'Jordan',
    birthday: '1985-05-10',
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: ID_TAYLOR,
    name: 'Taylor',
    birthday: '1992-05-28',
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: ID_MORGAN,
    name: 'Morgan',
    birthday: '1988-06-03',
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: ID_CASEY,
    name: 'Casey',
    birthday: '1995-04-30',
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// Seed wishlist items (AF1 demo data)
// ---------------------------------------------------------------------------

const SEED_WISHLIST: WishlistItem[] = [
  {
    id: 'seed-wish-1',
    birthdayEntryId: ID_ALEX,
    title: 'Kindle Paperwhite',
    url: 'https://www.amazon.com/dp/B08KTZ8249',
    notes: undefined,
    claimedBy: undefined,
    claimedAt: undefined,
  },
  {
    id: 'seed-wish-2',
    birthdayEntryId: ID_ALEX,
    title: 'Cozy knit sweater (size M)',
    url: undefined,
    notes: 'Prefers neutral colors',
    claimedBy: 'Jamie',
    claimedAt: '2026-01-05T10:00:00.000Z',
  },
  {
    id: 'seed-wish-3',
    birthdayEntryId: ID_JORDAN,
    title: 'Hiking boots (size 10)',
    url: 'https://www.rei.com/product/hiking-boots',
    notes: undefined,
    claimedBy: undefined,
    claimedAt: undefined,
  },
  {
    id: 'seed-wish-4',
    birthdayEntryId: ID_JORDAN,
    title: 'Spotify Premium gift card',
    url: undefined,
    notes: undefined,
    claimedBy: undefined,
    claimedAt: undefined,
  },
  {
    id: 'seed-wish-5',
    birthdayEntryId: ID_TAYLOR,
    title: 'The Midnight Library (book)',
    url: 'https://bookshop.org/p/books/the-midnight-library',
    notes: undefined,
    claimedBy: 'Sam',
    claimedAt: '2026-01-10T14:30:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// Seed group gifts (AF3 demo data)
// ---------------------------------------------------------------------------

const SEED_GROUP_GIFTS: GroupGift[] = [
  {
    id: 'seed-gg-1',
    birthdayEntryId: ID_ALEX,
    giftDescription: 'Kindle Paperwhite',
    targetAmount: 140,
    captainName: 'Jamie',
    createdAt: '2026-01-02T09:00:00.000Z',
    status: 'open',
  },
  {
    id: 'seed-gg-2',
    birthdayEntryId: ID_JORDAN,
    giftDescription: 'REI gift card',
    targetAmount: 60,
    captainName: 'Morgan',
    createdAt: '2026-01-03T09:00:00.000Z',
    status: 'open',
  },
];

const SEED_CONTRIBUTIONS: GroupGiftContribution[] = [
  {
    id: 'seed-ggc-1',
    groupGiftId: 'seed-gg-1',
    contributorName: 'Sam',
    amount: 40,
    item: undefined,
    note: undefined,
    addedAt: '2026-01-04T10:00:00.000Z',
  },
  {
    id: 'seed-ggc-2',
    groupGiftId: 'seed-gg-1',
    contributorName: 'Chris',
    amount: 35,
    item: 'wrapped it!',
    note: undefined,
    addedAt: '2026-01-05T11:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Runs once on first launch.  Subsequent calls are instant no-ops because
 * the seed flag is checked before writing anything.
 */
export async function ensureSeeded(): Promise<void> {
  const flag = await AsyncStorage.getItem(SEED_FLAG_KEY);
  if (flag) return; // Already seeded — nothing to do

  // Check if there are already existing entries to avoid overwriting user data
  // (This handles the edge case where the flag was lost but data exists)
  const existing = await loadEntries();
  const existingIds = new Set(existing.map((e) => e.id));

  for (const entry of SEED_ENTRIES) {
    if (!existingIds.has(entry.id)) {
      await addEntry(entry);
    }
  }

  for (const item of SEED_WISHLIST) {
    await addWishlistItem(item);
  }

  for (const gift of SEED_GROUP_GIFTS) {
    await addGroupGift(gift);
  }

  for (const contrib of SEED_CONTRIBUTIONS) {
    await addGroupGiftContribution(contrib);
  }

  // Mark as seeded so this never runs again
  await AsyncStorage.setItem(SEED_FLAG_KEY, 'true');
}
