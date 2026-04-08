/**
 * Date utility functions for the Birthday Tracker app.
 *
 * The trickiest part of a birthday tracker is figuring out how many days
 * until the *next* occurrence of a birthday — not how old someone will be,
 * just "when is the next time this month/day occurs on the calendar?"
 *
 * All date arithmetic here is performed in the device's LOCAL timezone.
 * We achieve this by using the Date constructor with explicit year/month/day
 * arguments instead of passing an ISO string — parsing "2024-03-15" as a
 * string treats it as UTC midnight, which can land on the wrong day for
 * users west of UTC.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Parse the month (0-indexed) and day from an ISO "YYYY-MM-DD" string.
 * Returns values suitable for use with `new Date(year, month, day)`.
 *
 * We parse manually instead of calling `new Date(isoString)` to avoid
 * timezone offset issues — see module notes above.
 */
function parseBirthdayParts(isoDate: string): { month: number; day: number; year: number } {
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  return {
    year: parseInt(yearStr, 10),
    month: parseInt(monthStr, 10) - 1, // Date() months are 0-indexed (Jan = 0)
    day: parseInt(dayStr, 10),
  };
}

/**
 * Returns true if the given year is a leap year.
 * A year is a leap year if it is divisible by 4, except for century years
 * which must be divisible by 400.  Example: 2000 ✓, 1900 ✗, 2024 ✓.
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Given a birthday (month/day) and a target year, return the Date object
 * that represents when that birthday falls in that year.
 *
 * Special case — Feb 29 in a non-leap year: the spec says to treat March 1
 * as the equivalent date.  For example, someone born on Feb 29, 1992 would
 * "celebrate" on March 1, 2023 (a non-leap year).
 */
function birthdayInYear(month: number, day: number, year: number): Date {
  if (month === 1 && day === 29 && !isLeapYear(year)) {
    // Shift Feb 29 → March 1 in non-leap years
    return new Date(year, 2, 1); // month 2 = March in 0-indexed months
  }
  return new Date(year, month, day);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert an ISO "YYYY-MM-DD" birthday string into a JavaScript Date object
 * whose year/month/day are interpreted in LOCAL timezone.
 *
 * Useful when initialising the DateTimePicker with an existing value.
 */
export function parseDateFromISO(isoDate: string): Date {
  const { year, month, day } = parseBirthdayParts(isoDate);
  return new Date(year, month, day);
}

/**
 * Calculate how many full days remain until the *next* occurrence of a
 * birthday.
 *
 * Logic:
 *  1. Start with the birthday's month/day in the current calendar year.
 *  2. If that date is already in the past (or today is the birthday), check
 *     whether "today" is exactly that date → 0.  Otherwise advance to next year.
 *  3. The result is (nextOccurrence - today) / milliseconds-per-day, rounded.
 *
 * Returns 0 for today's birthday, 1 for tomorrow, etc.
 */
export function daysUntilBirthday(birthdayISO: string): number {
  // "today" at local midnight — we strip the time so comparisons are day-accurate
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { month, day } = parseBirthdayParts(birthdayISO);

  // Try this calendar year first
  let nextOccurrence = birthdayInYear(month, day, today.getFullYear());

  // If the occurrence has already passed today, roll over to next year
  if (nextOccurrence < today) {
    nextOccurrence = birthdayInYear(month, day, today.getFullYear() + 1);
  }

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  // Math.round handles any daylight-saving-time edge cases (±1 hr shift)
  return Math.round((nextOccurrence.getTime() - today.getTime()) / MS_PER_DAY);
}

/**
 * Format a birthday ISO string as a human-readable "Month Day" string,
 * e.g. "April 8" or "February 29".
 *
 * We use year 2000 as a dummy year for formatting because 2000 is a leap
 * year — this ensures Feb 29 renders correctly.
 *
 * The birth year is intentionally NOT shown here; it's stored in the data
 * but the spec does not display age on the card.
 */
export function formatBirthdayDate(birthdayISO: string): string {
  const { month, day } = parseBirthdayParts(birthdayISO);
  // year 2000 is a safe dummy; it's a leap year so Feb 29 is valid
  const date = new Date(2000, month, day);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

/**
 * Build the "days until" label displayed on a birthday card.
 *
 * Returns:
 *   "Today! 🎂"   — 0 days
 *   "Tomorrow!"   — 1 day
 *   "N days away" — any other positive value
 */
export function daysUntilLabel(birthdayISO: string): string {
  const days = daysUntilBirthday(birthdayISO);
  if (days === 0) return 'Today! 🎂';
  if (days === 1) return 'Tomorrow!';
  return `${days} days away`;
}
