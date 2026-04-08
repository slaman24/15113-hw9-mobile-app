# Code Review — Birthday Tracker

Reviewed against SPEC.md acceptance criteria. Each finding is marked [PASS], [FAIL], or [WARN].

---

## AC1 — Home Screen

1. [PASS] The home screen renders a scrollable FlatList of birthday cards.  
   `app/(tabs)/index.tsx`

2. [PASS] Cards are sorted by ascending `daysUntilBirthday` — the entry with the fewest days remaining appears first.  
   `app/(tabs)/index.tsx` lines 75–78

3. [PASS] Each card displays name, formatted birthday string (e.g. "April 8"), and the days-until label.  
   `app/(tabs)/index.tsx` `renderItem`

4. [PASS] Today's birthday shows "Today! 🎂" and tomorrow's shows "Tomorrow!".  
   `utils/dateUtils.ts` `daysUntilLabel`

5. [PASS] Cards with non-empty notes show the notes text; empty/whitespace-only notes are hidden.  
   `app/(tabs)/index.tsx` — `item.notes.trim().length > 0` guard

6. [PASS] Empty state message ("No birthdays yet!") is shown via `ListEmptyComponent` when entries is empty.  
   `app/(tabs)/index.tsx`

7. [PASS] Tapping a card calls `router.push('/edit/${item.id}')` and navigates to the Edit screen.  
   `app/(tabs)/index.tsx`

---

## AC2 — Add Screen

8. [PASS] The Add screen contains a Name text input, a Birthday date picker (DateTimePicker), and a multi-line Notes input.  
   `app/(tabs)/add.tsx`

9. [PASS] Submitting without a name shows the inline error "Name is required." and does not save.  
   `app/(tabs)/add.tsx` `validate()`

10. [PASS] Submitting without selecting a birthday shows "Please select a birthday." and does not save.  
    `app/(tabs)/add.tsx` `validate()`

11. [PASS] Notes exceeding 500 characters shows the inline error and does not save. Character counter turns red.  
    `app/(tabs)/add.tsx` `validate()` and char-count display

12. [PASS] Errors clear immediately as the user corrects the field (inline, not only on submit).  
    `app/(tabs)/add.tsx` `handleNameChange`, `handleNotesChange`, `handleDateChange`

13. [PASS] Valid save calls `addEntry`, resets all fields, and calls `router.replace('/(tabs)')`.  
    `app/(tabs)/add.tsx` `handleSave`

14. [PASS] The new entry appears in the correct chronological position on return because `useFocusEffect` reloads and re-sorts the list.  
    `app/(tabs)/index.tsx`

---

## AC3 — Edit Screen

15. [PASS] Edit screen is reached via `router.push('/edit/${item.id}')` from the Home screen only.  
    `app/(tabs)/index.tsx`

16. [PASS] All fields (Name, Birthday, Notes) are pre-populated with the entry's stored values on load.  
    `app/edit/[id].tsx` `useEffect` load block

17. [PASS] Saving with an empty name or no birthday shows inline validation errors and does not save.  
    `app/edit/[id].tsx` `validate()`

18. [PASS] Valid save calls `updateEntry`, preserves `createdAt`, bumps `updatedAt`, and calls `router.replace('/(tabs)')`.  
    `app/edit/[id].tsx` `handleSave`

19. [PASS] Tapping Delete calls `Alert.alert` with "Cancel" (style: 'cancel') and "Delete" (style: 'destructive').  
    `app/edit/[id].tsx` `handleDelete`

20. [PASS] Confirming Delete calls `deleteEntry(id)` and navigates back; cancelling does nothing.  
    `app/edit/[id].tsx` `handleDelete`

21. [PASS] If the Edit screen is opened with an unknown `id`, the "not found" UI is shown with a "Go Back" button.  
    `app/edit/[id].tsx` `notFound` state and render branch

---

## AC4 — Persistence

22. [PASS] All entries are stored as a JSON array under `@birthday_tracker:entries` and survive app restarts.  
    `utils/storage.ts`

23. [PASS] A missing AsyncStorage key (cold start) is treated as an empty array via `if (!json) return []`.  
    `utils/storage.ts` `loadEntries`

24. [PASS] The Home screen list loads immediately on focus via `useFocusEffect`, no extra user action needed.  
    `app/(tabs)/index.tsx`

25. [PASS] An AsyncStorage read failure on the Home screen is caught, logged, sets `loadError=true`, and renders the error banner with an empty list — the app does not crash.  
    `app/(tabs)/index.tsx`

26. [PASS] A write failure on save (Add or Edit) is caught and shows an alert; the screen does not navigate away.  
    `app/(tabs)/add.tsx` `handleSave`, `app/edit/[id].tsx` `handleSave`

27. [PASS] A delete failure is caught and shows an alert; the entry is not removed from the UI.  
    `app/edit/[id].tsx` `handleDelete`

---

## AC5 — "Days Until" Calculation

28. [PASS] The calculation uses only the month/day of the stored birthday, not the birth year.  
    `utils/dateUtils.ts` `daysUntilBirthday` — only `month` and `day` extracted from `parseBirthdayParts`

29. [PASS] Leap-day (Feb 29) birthdays are mapped to March 1 in non-leap years.  
    `utils/dateUtils.ts` `birthdayInYear`

30. [PASS] Today's birthday correctly yields 0; tomorrow's yields 1. `Math.round` is used to absorb DST ±1-hour shifts.  
    `utils/dateUtils.ts` `daysUntilBirthday`

31. [PASS] "Days until" values are recalculated on every Home screen focus via `useFocusEffect`.  
    `app/(tabs)/index.tsx`

---

## Bugs and Logic Errors

32. [WARN] **Unused import in add.tsx** — `parseDateFromISO` is imported from `@/utils/dateUtils` but never called anywhere in the file. The Add screen initialises `selectedDate` to `null` and only sets it via the DateTimePicker callback, so the import serves no purpose. ESLint should flag this.  
    `app/(tabs)/add.tsx` line ~36

33. [WARN] **Misleading error state in EditScreen on AsyncStorage failure** — The `catch` block in the `useEffect` load sets `setNotFound(true)`. If a storage I/O error occurs (not just a missing entry), the user sees "Birthday not found", implying their data was deleted when in fact there was a storage failure. A separate `loadError` boolean (similar to HomeScreen) would communicate the correct cause.  
    `app/edit/[id].tsx` lines ~115–118

34. [WARN] **`daysUntilBirthday` called twice per card in renderItem** — `daysUntilLabel(item.birthday)` calls `daysUntilBirthday` internally, then `isToday` calls it a second time. The result should be computed once and reused.  
    `app/(tabs)/index.tsx` `renderItem`

35. [WARN] **`JSON.parse` in `loadEntries` is not wrapped in a try-catch** — If the stored JSON is corrupted (e.g. partial write), `JSON.parse` throws a `SyntaxError`. While callers do have their own try-catch blocks, the error message from the propagated `SyntaxError` may be misleading. Wrapping the parse and returning `[]` (or re-throwing with a clearer message) would produce better diagnostic output.  
    `utils/storage.ts` `loadEntries` line ~37

---

## Missing Error Handling

36. [WARN] **EH2 — No read-failure UI path in EditScreen** — The spec (EH2) requires a non-blocking error banner when a read fails. The Home screen implements this correctly. The Edit screen collapses both "entry not found" and "storage failure" into the same `notFound` UI branch (see finding 33 above), which means a storage failure on the Edit screen is never communicated accurately to the user.

---

## Code Quality

37. [WARN] **`modal.tsx` is unused Expo template boilerplate** — `app/modal.tsx` is a default screen from the Expo starter template. It is never linked to from any screen in this app and has no Stack.Screen registration in `_layout.tsx`. It is dead code and should be removed to keep the route table clean.  
    `app/modal.tsx`

38. [WARN] **`MAX_NOTES_LENGTH` is duplicated** — The constant `MAX_NOTES_LENGTH = 500` is defined identically in both `app/(tabs)/add.tsx` and `app/edit/[id].tsx`. If the limit ever changes, both files must be updated in sync. It should be extracted to a shared constants file (e.g. `constants/validation.ts`).  
    `app/(tabs)/add.tsx` line ~43, `app/edit/[id].tsx` line ~52

39. [WARN] **Validation logic is duplicated** — The `validate()` function body and the field-change error-clearing handlers (`handleNameChange`, `handleNotesChange`, `handleDateChange`) are copy-pasted between `add.tsx` and `edit/[id].tsx` with no differences. Extracting these into a shared custom hook (e.g. `useBirthdayForm`) would reduce maintenance burden.

---

## Security

40. [WARN] **Non-cryptographic UUID generation** — `Math.random()` is used to generate entry IDs in `add.tsx`. The comment explains that `crypto.randomUUID()` is unavailable in Hermes. For this use case (local primary keys, never used as security tokens), this is acceptable. However, the `expo-crypto` package (available in Expo SDK 54) exposes `Crypto.randomUUID()` via a polyfill and would be a drop-in, more robust replacement.  
    `app/(tabs)/add.tsx` UUID generation block

41. [PASS] **No unsafe file handling or external network calls** — All data is confined to `AsyncStorage`. No user input is interpolated into SQL, shell commands, or eval. The alert message in `handleDelete` interpolates `entry?.name` into a native Alert string, which is safe (React Native's Alert API is not a web surface subject to XSS).
