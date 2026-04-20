/**
 * AsyncStorage helpers for the Birthday Tracker app.
 *
 * All birthday entries are stored in a SINGLE AsyncStorage key as a JSON
 * array.  This is a common pattern for small datasets — instead of one key
 * per entry, we read/write the whole array at once.  AsyncStorage is a
 * simple key-value store built into React Native; think of it like
 * localStorage on the web.
 *
 * Every function here is `async` (returns a Promise) because disk I/O is
 * asynchronous — the app keeps running while the read/write is happening in
 * the background.  Callers should `await` these functions and wrap them in
 * try/catch to handle failures gracefully.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BirthdayEntry, GroupGift, GroupGiftContribution, WishlistItem } from '@/types/birthday';

/** The single key under which ALL entries live in AsyncStorage. */
const STORAGE_KEY = '@birthday_tracker:entries';

const WISHLISTS_KEY = '@birthday_tracker:wishlists';
const GROUP_GIFTS_KEY = '@birthday_tracker:group_gifts';
const GROUP_GIFT_CONTRIBUTIONS_KEY = '@birthday_tracker:group_gift_contributions';
export const SEED_FLAG_KEY = '@birthday_tracker:seeded';

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Load all birthday entries from local storage.
 *
 * Returns an empty array when the app is opened for the first time (no key
 * found) — callers should treat that the same as "no entries yet."
 */
export async function loadEntries(): Promise<BirthdayEntry[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  // getItem returns null when the key has never been written
  if (!json) return [];
  return JSON.parse(json) as BirthdayEntry[];
}

// ---------------------------------------------------------------------------
// Write helpers (all operate on the full array)
// ---------------------------------------------------------------------------

/**
 * Overwrite the entire entries array in storage.
 * All other write functions call this internally after modifying the array.
 */
async function persistEntries(entries: BirthdayEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// ---------------------------------------------------------------------------
// Individual CRUD operations
// ---------------------------------------------------------------------------

/**
 * Append a new entry to the stored array.
 * The caller is responsible for building the full BirthdayEntry object
 * (including a unique `id`, `createdAt`, and `updatedAt`).
 */
export async function addEntry(entry: BirthdayEntry): Promise<void> {
  const entries = await loadEntries();
  entries.push(entry);
  await persistEntries(entries);
}

/**
 * Replace an existing entry (matched by `id`) with an updated version.
 * Throws if no entry with the given id exists — callers should handle this.
 */
export async function updateEntry(updated: BirthdayEntry): Promise<void> {
  const entries = await loadEntries();
  const index = entries.findIndex((e) => e.id === updated.id);
  if (index === -1) {
    throw new Error(`Entry with id "${updated.id}" not found.`);
  }
  entries[index] = updated;
  await persistEntries(entries);
}

/**
 * Remove an entry by `id` from storage.
 * A no-op (no error) if the id doesn't exist — safe to call even if the
 * entry was already deleted.
 */
export async function deleteEntry(id: string): Promise<void> {
  const entries = await loadEntries();
  const filtered = entries.filter((e) => e.id !== id);
  await persistEntries(filtered);
}

// ---------------------------------------------------------------------------
// AF1 — Wishlist storage helpers
// ---------------------------------------------------------------------------

export async function loadWishlistItems(): Promise<WishlistItem[]> {
  const json = await AsyncStorage.getItem(WISHLISTS_KEY);
  if (!json) return [];
  return JSON.parse(json) as WishlistItem[];
}

async function persistWishlistItems(items: WishlistItem[]): Promise<void> {
  await AsyncStorage.setItem(WISHLISTS_KEY, JSON.stringify(items));
}

export async function loadWishlistForEntry(birthdayEntryId: string): Promise<WishlistItem[]> {
  const all = await loadWishlistItems();
  return all.filter((item) => item.birthdayEntryId === birthdayEntryId);
}

export async function addWishlistItem(item: WishlistItem): Promise<void> {
  const items = await loadWishlistItems();
  items.push(item);
  await persistWishlistItems(items);
}

export async function updateWishlistItem(updated: WishlistItem): Promise<void> {
  const items = await loadWishlistItems();
  const index = items.findIndex((i) => i.id === updated.id);
  if (index === -1) throw new Error(`WishlistItem with id "${updated.id}" not found.`);
  items[index] = updated;
  await persistWishlistItems(items);
}

export async function deleteWishlistItemsByEntry(birthdayEntryId: string): Promise<void> {
  const items = await loadWishlistItems();
  await persistWishlistItems(items.filter((i) => i.birthdayEntryId !== birthdayEntryId));
}

// ---------------------------------------------------------------------------
// AF3 — Group Gift storage helpers
// ---------------------------------------------------------------------------

export async function loadGroupGifts(): Promise<GroupGift[]> {
  const json = await AsyncStorage.getItem(GROUP_GIFTS_KEY);
  if (!json) return [];
  return JSON.parse(json) as GroupGift[];
}

async function persistGroupGifts(gifts: GroupGift[]): Promise<void> {
  await AsyncStorage.setItem(GROUP_GIFTS_KEY, JSON.stringify(gifts));
}

export async function addGroupGift(gift: GroupGift): Promise<void> {
  const gifts = await loadGroupGifts();
  gifts.push(gift);
  await persistGroupGifts(gifts);
}

export async function updateGroupGift(updated: GroupGift): Promise<void> {
  const gifts = await loadGroupGifts();
  const index = gifts.findIndex((g) => g.id === updated.id);
  if (index === -1) throw new Error(`GroupGift with id "${updated.id}" not found.`);
  gifts[index] = updated;
  await persistGroupGifts(gifts);
}

export async function loadGroupGiftContributions(): Promise<GroupGiftContribution[]> {
  const json = await AsyncStorage.getItem(GROUP_GIFT_CONTRIBUTIONS_KEY);
  if (!json) return [];
  return JSON.parse(json) as GroupGiftContribution[];
}

async function persistGroupGiftContributions(contribs: GroupGiftContribution[]): Promise<void> {
  await AsyncStorage.setItem(GROUP_GIFT_CONTRIBUTIONS_KEY, JSON.stringify(contribs));
}

export async function addGroupGiftContribution(contrib: GroupGiftContribution): Promise<void> {
  const contribs = await loadGroupGiftContributions();
  contribs.push(contrib);
  await persistGroupGiftContributions(contribs);
}
