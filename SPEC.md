# Birthday Tracker — App Specification

## Overview

Birthday Tracker is a React Native (Expo) mobile app that helps users remember and organize birthdays for their family and friends. Users can add birthday entries with optional notes, view a chronological list of upcoming birthdays, and edit or delete entries at any time. All data is persisted locally using AsyncStorage so entries survive app restarts.

---

## Tech Stack

| Layer       | Technology                                                    |
| ----------- | ------------------------------------------------------------- |
| Framework   | React Native via Expo (SDK 54)                                |
| Routing     | Expo Router (file-based, tab + stack)                         |
| Persistence | `@react-native-async-storage/async-storage`                   |
| Language    | TypeScript                                                    |
| Styling     | React Native `StyleSheet` + `constants/theme.ts` color tokens |

---

## App Architecture

### Navigation Structure

```
app/
├── (tabs)/
│   ├── _layout.tsx       — Tab bar with "Home" and "Add" tabs
│   ├── index.tsx         — Home screen: upcoming birthdays list
│   └── add.tsx           — Add screen: form to create a new entry
└── edit/
    └── [id].tsx          — Edit screen: form to update or delete an entry
```

- The **Home** tab (`index.tsx`) and **Add** tab (`add.tsx`) are the two primary tabs.
- Tapping a birthday card on the Home screen navigates to the **Edit** screen (`edit/[id].tsx`), which is a stack route pushed on top of the tab navigator (not a tab itself).

---

## Data Model

Each birthday entry is stored as a plain JSON object. The full collection is stored in AsyncStorage under a single key (`@birthday_tracker:entries`).

```typescript
interface BirthdayEntry {
  id: string; // UUID (e.g., generated with crypto.randomUUID or a uuid library)
  name: string; // Full name of the person — required, non-empty
  birthday: string; // ISO 8601 date string: "YYYY-MM-DD"
  notes: string; // Free-form text (gift ideas, party plans, etc.) — may be empty string
  createdAt: string; // ISO 8601 timestamp: set once on creation
  updatedAt: string; // ISO 8601 timestamp: updated on every save
}
```

### AsyncStorage Schema

| Key                         | Value                             |
| --------------------------- | --------------------------------- |
| `@birthday_tracker:entries` | `JSON.stringify(BirthdayEntry[])` |

---

## Required Features

### F1 — Home Screen: Upcoming Birthdays List

- Display all saved birthday entries sorted **chronologically by next upcoming birthday** (i.e., by how many days remain until the birthday in the current calendar year or the next, not by birth year).
- Each card in the list must show:
  - Person's **name**
  - **Birthday** formatted as a human-readable string (e.g., "April 8")
  - **Days until** counter — an integer representing the number of full days until the next occurrence of the birthday (e.g., "3 days away", "Today! 🎂", "Tomorrow!")
  - **Notes** — displayed if non-empty; hidden (or shown as a placeholder) if empty
- Tapping a card navigates to the Edit screen for that entry.
- When the list is empty, display an **empty state** message prompting the user to add their first birthday via the Add tab.

### F2 — Add Screen: Create a New Entry

- Provide a form with the following fields:
  - **Name** — required text input
  - **Birthday** — required date input (use a date picker component or platform date picker via `@react-native-community/datetimepicker` or equivalent)
  - **Notes** — optional multi-line text input
- A **Save** button submits the form.
- On successful save, the new entry is persisted to AsyncStorage, the form fields are cleared/reset, and the user is navigated to the Home tab so they can see the new entry in the list.
- The **year** of the birthday should be captured and stored (to allow display of age / birth year in the future), but the primary sort key for the list is the next calendar occurrence regardless of year.

### F3 — Edit Screen: Update or Delete an Entry

- Navigated to by tapping a card on the Home screen; receives the entry `id` as a route parameter.
- Pre-populates all form fields (Name, Birthday, Notes) with the existing values for that entry.
- A **Save** button persists the updated values to AsyncStorage and navigates back to the Home screen.
- A **Delete** button permanently removes the entry from AsyncStorage and navigates back to the Home screen.
- Before executing a delete, display a **confirmation dialog** (e.g., `Alert.alert`) asking the user to confirm. The dialog must have both a "Cancel" and a "Delete" option.

### F4 — Data Persistence with AsyncStorage

- All reads from AsyncStorage must happen at app startup (or when the Home screen mounts) and whenever the data changes.
- All writes (add, update, delete) must be awaited before navigating away or confirming success to the user.
- The app must gracefully handle a cold start where no data has been saved yet (treat a missing key as an empty array).

---

## Error Handling

### EH1 — Form Validation (Add & Edit Screens)

| Condition                            | Behavior                                                                                                                |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **Name is empty or whitespace-only** | Prevent form submission; display an inline error message below the Name field (e.g., "Name is required.")               |
| **Birthday is not selected**         | Prevent form submission; display an inline error message below the Birthday field (e.g., "Please select a birthday.")   |
| **Notes exceeds 500 characters**     | Prevent form submission; display a character count and an inline error (e.g., "Notes must be 500 characters or fewer.") |

Errors must be shown inline (not only via alert dialogs) and must clear as soon as the user corrects the offending field.

### EH2 — AsyncStorage Failures

| Condition                   | Behavior                                                                                                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Read failure on load**    | Log the error to the console; display a non-blocking error banner or alert informing the user that their saved data could not be loaded; render an empty list (do not crash) |
| **Write failure on save**   | Await the write; if it rejects, display an alert to the user informing them the entry could not be saved, and do **not** navigate away from the form                         |
| **Write failure on delete** | Display an alert informing the user the entry could not be deleted; keep the entry in the displayed list                                                                     |

### EH3 — Edit Screen: Entry Not Found

If the Edit screen is opened with an `id` that does not correspond to any stored entry (e.g., a stale deep link), display an error message and a button to navigate back to the Home screen. Do not crash or show an empty, unresponsive form.

### EH4 — Date Edge Cases

- **February 29 (leap day) birthdays**: When the current year is not a leap year, treat March 1 of the current year as the equivalent occurrence for the "days until" calculation.
- **Today's birthday**: Display a special label (e.g., "Today! 🎂") instead of "0 days away".
- **Tomorrow's birthday**: Display "Tomorrow!" instead of "1 day away".
- All date arithmetic must be performed in the **device's local timezone**.

---

## Acceptance Criteria

### AC1 — Home Screen

- [ ] The home screen renders a scrollable list of birthday cards.
- [ ] Cards are sorted so the birthday with the fewest days remaining appears first.
- [ ] Each card displays the person's name, a formatted birthday string (month and day), and the "days until" label.
- [ ] A card whose birthday falls today displays "Today! 🎂".
- [ ] A card whose birthday falls tomorrow displays "Tomorrow!".
- [ ] Cards with non-empty notes display the notes text; cards with empty notes do not display an empty notes section.
- [ ] When there are no saved entries, the screen shows an empty state message rather than a blank screen.
- [ ] Tapping any card navigates to the Edit screen pre-populated with that card's data.

### AC2 — Add Screen

- [ ] The Add screen contains a Name text input, a Birthday date picker, and a Notes multi-line text input.
- [ ] Submitting the form without a name shows an inline validation error and does not save.
- [ ] Submitting the form without selecting a birthday shows an inline validation error and does not save.
- [ ] A valid form submission saves the new entry to AsyncStorage.
- [ ] After a successful save, the form resets and the user is taken to the Home tab.
- [ ] The new entry appears in the Home screen list in the correct chronological position.

### AC3 — Edit Screen

- [ ] The Edit screen is reachable only by tapping a birthday card on the Home screen.
- [ ] All fields are pre-populated with the selected entry's current values on load.
- [ ] Saving with an empty name or no birthday shows inline validation errors and does not save.
- [ ] A valid save updates the entry in AsyncStorage and navigates back to the Home screen.
- [ ] Tapping Delete triggers a confirmation dialog with "Cancel" and "Delete" options.
- [ ] Confirming Delete removes the entry from AsyncStorage and navigates back to the Home screen; the entry no longer appears in the list.
- [ ] Cancelling the Delete dialog dismisses the dialog and leaves the entry unchanged.
- [ ] If the Edit screen is opened with an invalid `id`, an error message and a "Go Back" button are shown.

### AC4 — Persistence

- [ ] Killing and relaunching the app preserves all previously saved entries.
- [ ] The list on the Home screen reflects the correct state immediately after launch (no additional user action required to load entries).
- [ ] An AsyncStorage read failure on launch does not crash the app; it shows an error banner and an empty list.
- [ ] An AsyncStorage write failure on save or delete shows an alert and leaves the UI in a consistent state.

### AC5 — "Days Until" Calculation

- [ ] The counter is based on the **next upcoming calendar occurrence** of the birthday, regardless of the stored birth year.
- [ ] The counter displays the correct integer number of days remaining.
- [ ] Leap-day birthdays use March 1 as the equivalent date in non-leap years.
- [ ] The "days until" values on the Home screen are recalculated each time the Home screen is focused (so the app stays accurate if left open overnight).

---

## Out of Scope (for this version)

- Push notifications or local reminders for upcoming birthdays
- Cloud sync or multi-device support
- Social sharing of birthday events
- Photo attachments to birthday entries
- Age calculation or birth year display in the card UI (data is stored but not shown)
- Search or filter functionality
