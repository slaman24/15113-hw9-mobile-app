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
import { BirthdayEntry } from '@/types/birthday';

/** The single key under which ALL entries live in AsyncStorage. */
const STORAGE_KEY = '@birthday_tracker:entries';

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
