/**
 * Data model for a birthday entry.
 *
 * All entries are stored as plain JSON objects in a single AsyncStorage key.
 * TypeScript interfaces let us describe the "shape" of that data and get
 * compiler errors if we ever attempt to access a field that doesn't exist.
 */
export interface BirthdayEntry {
  /** Unique identifier generated with crypto.randomUUID at creation time. */
  id: string;

  /** Full name of the person — required, non-empty. */
  name: string;

  /**
   * ISO 8601 date string in "YYYY-MM-DD" format.
   * We store the full birth year so age could be calculated later,
   * but the list sorts by *next calendar occurrence* (month/day only).
   */
  birthday: string;

  /**
   * Free-form notes, e.g. gift ideas or party plans.
   * Always present — use an empty string "" when the user leaves it blank.
   */
  notes: string;

  /** ISO 8601 timestamp set once when the entry is first created. */
  createdAt: string;

  /** ISO 8601 timestamp updated on every save (create or update). */
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// AF1 — Gift Wishlists
// ---------------------------------------------------------------------------

export interface WishlistItem {
  id: string;
  birthdayEntryId: string;
  title: string;
  url?: string;
  notes?: string;
  claimedBy?: string;
  claimedAt?: string;
}

// ---------------------------------------------------------------------------
// AF3 — Group Gift Organizer
// ---------------------------------------------------------------------------

export interface GroupGift {
  id: string;
  birthdayEntryId: string;
  giftDescription: string;
  targetAmount?: number;
  captainName: string;
  createdAt: string;
  status: 'open' | 'closed';
}

export interface GroupGiftContribution {
  id: string;
  groupGiftId: string;
  contributorName: string;
  amount?: number;
  item?: string;
  note?: string;
  addedAt: string;
}
