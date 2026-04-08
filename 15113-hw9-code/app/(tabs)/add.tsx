/**
 * Add Screen — form for creating a new birthday entry.
 *
 * New React Native / Expo concepts introduced here:
 *
 *  • ScrollView  — unlike FlatList (optimised for large lists of homogeneous
 *    items), ScrollView renders all its children at once.  It's the right
 *    choice for a form where every field is always visible.
 *
 *  • KeyboardAvoidingView  — on iOS, the software keyboard slides up from the
 *    bottom and can cover text inputs at the bottom of the form.  This
 *    wrapper automatically adjusts its height so the focused field stays
 *    visible above the keyboard.
 *
 *  • DateTimePicker (@react-native-community/datetimepicker)  — a native
 *    date/time picker component.  On iOS it renders inline (as a scrollable
 *    spinner); on Android it presents as a native modal dialog.
 *    The behaviour differs between platforms, so we use Platform.OS checks.
 *
 *  • router.replace  — navigates to a new screen AND removes the current
 *    screen from the history stack, so pressing Back can't return to the now-
 *    cleared form.  We use this after a successful save so the user lands on
 *    the Home screen with no "ghost" of the form in the stack.
 */

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BirthdayEntry } from '@/types/birthday';
import { parseDateFromISO } from '@/utils/dateUtils';
import { addEntry } from '@/utils/storage';

/** Maximum allowed length for the notes field (from the spec). */
const MAX_NOTES_LENGTH = 500;

export default function AddScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // -------------------------------------------------------------------------
  // Form state
  // -------------------------------------------------------------------------
  // Each piece of form data is its own piece of state.  When any of these
  // change, React re-renders only the parts of the UI that depend on them.

  const [name, setName] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');

  // -------------------------------------------------------------------------
  // Error state — one string per field, empty string means "no error"
  // -------------------------------------------------------------------------
  const [nameError, setNameError] = useState('');
  const [birthdayError, setBirthdayError] = useState('');
  const [notesError, setNotesError] = useState('');

  // -------------------------------------------------------------------------
  // Date picker visibility state
  // -------------------------------------------------------------------------
  // On iOS we toggle the picker open/closed manually.
  // On Android the picker is a native dialog that dismisses itself — we just
  // set showDatePicker=true to trigger it, and the onChange handler hides it.
  const [showDatePicker, setShowDatePicker] = useState(false);

  // -------------------------------------------------------------------------
  // Date picker handler
  // -------------------------------------------------------------------------

  /**
   * Called by DateTimePicker whenever the user changes the date value.
   *
   * `event.type` tells us whether the user committed a selection ("set") or
   * dismissed/cancelled the picker ("dismissed").
   *
   * On Android the picker is a dialog — it auto-closes after the user picks
   * a date, so we set showDatePicker=false here.
   * On iOS the picker stays visible; we keep it open and just update the
   * selectedDate as the user scrolls through the spinner.
   */
  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      // Always hide the picker after any Android interaction
      setShowDatePicker(false);
      if (_event.type === 'set' && date) {
        setSelectedDate(date);
        setBirthdayError(''); // Clear the error as soon as a date is chosen
      }
    } else {
      // iOS: update live as the user scrolls the spinner
      if (date) {
        setSelectedDate(date);
        setBirthdayError('');
      }
    }
  };

  // -------------------------------------------------------------------------
  // Field change handlers — clear errors as the user types
  // -------------------------------------------------------------------------

  const handleNameChange = (text: string) => {
    setName(text);
    // Clear the error immediately so the user sees instant feedback
    if (nameError && text.trim().length > 0) {
      setNameError('');
    }
  };

  const handleNotesChange = (text: string) => {
    setNotes(text);
    if (notesError && text.length <= MAX_NOTES_LENGTH) {
      setNotesError('');
    }
  };

  // -------------------------------------------------------------------------
  // Form validation
  // -------------------------------------------------------------------------

  /**
   * Validate all fields and set error messages for any that fail.
   * Returns true only when every field passes validation.
   *
   * We validate all fields at once (rather than stopping at the first error)
   * so the user can see everything they need to fix in one pass.
   */
  const validate = (): boolean => {
    let valid = true;

    if (name.trim().length === 0) {
      setNameError('Name is required.');
      valid = false;
    }

    if (!selectedDate) {
      setBirthdayError('Please select a birthday.');
      valid = false;
    }

    if (notes.length > MAX_NOTES_LENGTH) {
      setNotesError(`Notes must be ${MAX_NOTES_LENGTH} characters or fewer.`);
      valid = false;
    }

    return valid;
  };

  // -------------------------------------------------------------------------
  // Save handler
  // -------------------------------------------------------------------------

  const handleSave = async () => {
    if (!validate()) return; // Don't proceed if validation fails

    // At this point TypeScript knows selectedDate is non-null because
    // validate() would have returned false otherwise.  The "!" tells
    // TypeScript we're certain it isn't null.
    const birthday = selectedDate!;

    // Format the date as "YYYY-MM-DD" for storage.
    // We use local date components (not UTC) to avoid timezone drift.
    const year = birthday.getFullYear();
    const month = String(birthday.getMonth() + 1).padStart(2, '0'); // 0-indexed → 1-indexed
    const day = String(birthday.getDate()).padStart(2, '0');
    const birthdayISO = `${year}-${month}-${day}`;

    const now = new Date().toISOString();

    // Generate a UUID v4 for this entry's unique id.
    // We can't use `crypto.randomUUID()` here because the global `crypto`
    // object is not available in the Hermes JavaScript engine that React
    // Native / Expo SDK 54 uses.  Instead we use this standard UUID v4
    // template approach with Math.random():
    //
    //   'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    //   ↑ the string is a template — each 'x' gets replaced with a random
    //     hex digit; 'y' gets replaced with one of 8, 9, a, or b
    //     (that's the UUID v4 variant spec)
    //   ↑ the '4' in the third group is fixed — it identifies this as v4
    //
    // This is universally supported across all JS environments.
    const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;          // Random integer 0–15
      const v = c === 'x' ? r : (r & 0x3) | 0x8;  // 'y' must be 8, 9, a, or b
      return v.toString(16);
    });

    // Build the full entry object
    const newEntry: BirthdayEntry = {
      id,
      name: name.trim(),
      birthday: birthdayISO,
      notes: notes.trim(),
      createdAt: now,
      updatedAt: now,
    };

    try {
      await addEntry(newEntry);

      // Reset the form fields so the screen is clean if the user comes back
      setName('');
      setSelectedDate(null);
      setNotes('');
      setNameError('');
      setBirthdayError('');
      setNotesError('');

      // Navigate to the Home tab.
      // router.replace swaps this screen out so Back can't return to a blank form.
      router.replace('/(tabs)');
    } catch (err) {
      console.error('[AddScreen] Failed to save entry:', err);
      // Show an alert — don't navigate away so the user can try again
      Alert.alert(
        'Save Failed',
        'Your birthday could not be saved. Please try again.',
        [{ text: 'OK' }],
      );
    }
  };

  // -------------------------------------------------------------------------
  // Computed helpers for display
  // -------------------------------------------------------------------------

  /** Human-readable label shown on the date button. */
  const dateButtonLabel = selectedDate
    ? selectedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Select Birthday';

  const notesRemaining = MAX_NOTES_LENGTH - notes.length;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    /*
     * KeyboardAvoidingView + ScrollView is a common React Native pattern for
     * forms.  KeyboardAvoidingView listens for the keyboard and shrinks/shifts
     * the content so inputs don't get obscured.  ScrollView lets the user
     * scroll if the form is taller than the screen (especially with the
     * keyboard open).
     *
     * `behavior` is platform-specific:
     *   - 'padding' (iOS): adds padding to the bottom of the view
     *   - 'height' (Android): shrinks the view's height
     */
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        // Dismiss the keyboard when the user taps outside a text input
        keyboardShouldPersistTaps="handled"
      >
        {/* ---------------------------------------------------------------- */}
        {/* Name field                                                        */}
        {/* ---------------------------------------------------------------- */}
        <Text style={[styles.label, { color: colors.text }]}>Name *</Text>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, borderColor: nameError ? '#DC3545' : '#CCC' },
          ]}
          placeholder="e.g. Ada Lovelace"
          placeholderTextColor={colors.icon}
          value={name}
          onChangeText={handleNameChange}
          returnKeyType="next"       // Shows "Next" on the iOS keyboard
          autoCapitalize="words"     // Auto-capitalise proper names
        />
        {/* Inline error — only rendered when nameError is non-empty */}
        {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

        {/* ---------------------------------------------------------------- */}
        {/* Birthday field                                                    */}
        {/* ---------------------------------------------------------------- */}
        <Text style={[styles.label, { color: colors.text }]}>Birthday *</Text>

        {/*
         * Instead of a plain text input, tapping this button opens a native
         * date picker.  The selected date is displayed as the button label.
         */}
        <TouchableOpacity
          style={[
            styles.dateButton,
            { borderColor: birthdayError ? '#DC3545' : '#CCC' },
          ]}
          onPress={() => setShowDatePicker((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel="Open date picker"
        >
          <Text
            style={[
              styles.dateButtonText,
              { color: selectedDate ? colors.text : colors.icon },
            ]}
          >
            {dateButtonLabel}
          </Text>
        </TouchableOpacity>
        {birthdayError ? <Text style={styles.errorText}>{birthdayError}</Text> : null}

        {/*
         * DateTimePicker rendering.
         *
         * On iOS: we show it inline (as a spinner below the button) and add
         * a manual "Done" button to dismiss it.
         *
         * On Android: we just render the component when showDatePicker is
         * true; it appears as a native modal dialog and handleDateChange
         * sets showDatePicker=false after the user selects a date.
         */}
        {showDatePicker && (
          <>
            <DateTimePicker
              // value is required — we provide a sensible default (Jan 1 1990)
              // when no date has been chosen yet so the spinner doesn't jump
              // to today's date (which would be a strange default for a birthday)
              value={selectedDate ?? new Date(1990, 0, 1)}
              mode="date"
              // 'spinner' on iOS shows a scrollable drum-roll selector
              // 'default' on Android opens the system date-picker dialog
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
            {/* On iOS, provide a "Done" button to close the picker */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.doneButton, { backgroundColor: colors.tint }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Notes field                                                       */}
        {/* ---------------------------------------------------------------- */}
        <Text style={[styles.label, { color: colors.text }]}>Notes (optional)</Text>
        <TextInput
          style={[
            styles.input,
            styles.notesInput,
            { color: colors.text, borderColor: notesError ? '#DC3545' : '#CCC' },
          ]}
          placeholder="Gift ideas, allergies, party plans…"
          placeholderTextColor={colors.icon}
          value={notes}
          onChangeText={handleNotesChange}
          multiline            // Allows multiple lines of text
          textAlignVertical="top" // On Android, start typing at the top of the box
          returnKeyType="done"
        />

        {/* Character counter — turns red when the limit is exceeded */}
        <Text
          style={[
            styles.charCount,
            { color: notesRemaining < 0 ? '#DC3545' : colors.icon },
          ]}
        >
          {notes.length} / {MAX_NOTES_LENGTH}
        </Text>
        {notesError ? <Text style={styles.errorText}>{notesError}</Text> : null}

        {/* ---------------------------------------------------------------- */}
        {/* Save button                                                       */}
        {/* ---------------------------------------------------------------- */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.tint }]}
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="Save birthday"
        >
          <Text style={styles.saveButtonText}>Save Birthday</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40, // Extra space at the bottom so the Save button isn't flush with the edge
  },

  // ---- Form labels ---------------------------------------------------------
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 16,
  },

  // ---- Text inputs ---------------------------------------------------------
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  notesInput: {
    height: 100,    // Fixed height for the multi-line notes box
    paddingTop: 12, // iOS centres text vertically by default; this overrides that
  },

  // ---- Date picker button --------------------------------------------------
  dateButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateButtonText: {
    fontSize: 16,
  },

  // "Done" button that closes the iOS date picker spinner
  doneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },

  // ---- Character count -----------------------------------------------------
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },

  // ---- Inline error messages -----------------------------------------------
  errorText: {
    color: '#DC3545',
    fontSize: 13,
    marginTop: 4,
  },

  // ---- Save button ---------------------------------------------------------
  saveButton: {
    marginTop: 28,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
