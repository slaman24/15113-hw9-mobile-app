/**
 * Edit Screen — pre-populated form to update or delete a birthday entry.
 *
 * This screen is reached by tapping a card on the Home screen.  Expo Router
 * pushes it onto the navigation stack on top of the tab bar, so the tab bar
 * is hidden while this screen is visible.  The Back button in the header
 * returns the user to the Home tab.
 *
 * New concepts compared to the Add screen:
 *
 *  • useLocalSearchParams  — reads the dynamic URL segment.  When the user
 *    taps a card the app navigates to `/edit/<id>`, and this hook gives us
 *    the value of `id` from that URL.
 *
 *  • useEffect  — runs a side-effect (here: loading the entry from
 *    AsyncStorage) once when the component mounts.  The empty dependency
 *    array `[]` tells React "run this only on mount, not on every render."
 *
 *  • Alert.alert  — displays a native OS dialog with custom buttons.  Used
 *    for the delete confirmation so the user can't accidentally delete data.
 *
 *  • router.back / router.replace  — after saving or deleting we navigate
 *    back to the Home tab via `replace` so the stack stays clean.
 */

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { deleteEntry, loadEntries, updateEntry } from '@/utils/storage';

const MAX_NOTES_LENGTH = 500;

export default function EditScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // -------------------------------------------------------------------------
  // Route parameter
  // -------------------------------------------------------------------------

  /**
   * useLocalSearchParams reads URL parameters for the current route.
   * Since the file is named `[id].tsx`, Expo Router extracts the `id`
   * segment from the URL (e.g., "/edit/abc123" → { id: "abc123" }).
   */
  const { id } = useLocalSearchParams<{ id: string }>();

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  // The original entry loaded from storage — null until loaded
  const [entry, setEntry] = useState<BirthdayEntry | null>(null);
  // True when we've finished the initial load (success or failure)
  const [isLoading, setIsLoading] = useState(true);
  // True when no entry with the given id exists in storage
  const [notFound, setNotFound] = useState(false);

  // -------------------------------------------------------------------------
  // Form state
  // -------------------------------------------------------------------------

  const [name, setName] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

  const [nameError, setNameError] = useState('');
  const [birthdayError, setBirthdayError] = useState('');
  const [notesError, setNotesError] = useState('');

  // -------------------------------------------------------------------------
  // Date picker visibility
  // -------------------------------------------------------------------------

  const [showDatePicker, setShowDatePicker] = useState(false);

  // -------------------------------------------------------------------------
  // Load the entry on mount
  // -------------------------------------------------------------------------

  useEffect(() => {
    const load = async () => {
      try {
        const entries = await loadEntries();
        const found = entries.find((e) => e.id === id);

        if (found) {
          // Populate form fields with the existing values
          setEntry(found);
          setName(found.name);
          // parseDateFromISO converts "YYYY-MM-DD" to a local-timezone Date
          setSelectedDate(parseDateFromISO(found.birthday));
          setNotes(found.notes);
        } else {
          // The id doesn't match any stored entry — show the "not found" UI
          setNotFound(true);
        }
      } catch (err) {
        console.error('[EditScreen] Failed to load entry:', err);
        setNotFound(true);
      } finally {
        // Either way, we're done loading — remove the interim loading state
        setIsLoading(false);
      }
    };

    load();
  }, [id]); // Re-run only if the id URL parameter changes

  // -------------------------------------------------------------------------
  // Date picker handler (same pattern as the Add screen)
  // -------------------------------------------------------------------------

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (_event.type === 'set' && date) {
        setSelectedDate(date);
        setBirthdayError('');
      }
    } else {
      if (date) {
        setSelectedDate(date);
        setBirthdayError('');
      }
    }
  };

  // -------------------------------------------------------------------------
  // Field change handlers
  // -------------------------------------------------------------------------

  const handleNameChange = (text: string) => {
    setName(text);
    if (nameError && text.trim().length > 0) setNameError('');
  };

  const handleNotesChange = (text: string) => {
    setNotes(text);
    if (notesError && text.length <= MAX_NOTES_LENGTH) setNotesError('');
  };

  // -------------------------------------------------------------------------
  // Validation (identical logic to the Add screen)
  // -------------------------------------------------------------------------

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
    if (!validate()) return;
    if (!entry) return; // Shouldn't happen, but guards against the loading state

    const birthday = selectedDate!;
    const year = birthday.getFullYear();
    const month = String(birthday.getMonth() + 1).padStart(2, '0');
    const day = String(birthday.getDate()).padStart(2, '0');
    const birthdayISO = `${year}-${month}-${day}`;

    // Preserve the original createdAt; only bump updatedAt
    const updated: BirthdayEntry = {
      ...entry,               // Spread keeps id and createdAt from the original
      name: name.trim(),
      birthday: birthdayISO,
      notes: notes.trim(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await updateEntry(updated);
      // Navigate back to the Home tab — the list will reload via useFocusEffect
      router.replace('/(tabs)');
    } catch (err) {
      console.error('[EditScreen] Failed to update entry:', err);
      Alert.alert(
        'Save Failed',
        'Your changes could not be saved. Please try again.',
        [{ text: 'OK' }],
      );
    }
  };

  // -------------------------------------------------------------------------
  // Delete handler
  // -------------------------------------------------------------------------

  const handleDelete = () => {
    /*
     * Alert.alert(title, message, buttons) displays a native OS confirmation
     * dialog.  We always require explicit confirmation before deleting data.
     *
     * The 'destructive' style turns the Delete button red on iOS, signalling
     * to the user that this action is irreversible.
     */
    Alert.alert(
      'Delete Birthday',
      `Are you sure you want to delete ${entry?.name}'s birthday? This cannot be undone.`,
      [
        // "Cancel" does nothing — the dialog closes and the entry is unchanged
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntry(id);
              // Navigate back to the Home tab; the entry will be gone from the list
              router.replace('/(tabs)');
            } catch (err) {
              console.error('[EditScreen] Failed to delete entry:', err);
              Alert.alert(
                'Delete Failed',
                'The birthday could not be deleted. Please try again.',
                [{ text: 'OK' }],
              );
            }
          },
        },
      ],
    );
  };

  // -------------------------------------------------------------------------
  // Render: Loading state
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.icon }]}>Loading…</Text>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Entry not found (spec §EH3)
  // -------------------------------------------------------------------------

  if (notFound) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundTitle, { color: colors.text }]}>Birthday not found</Text>
        <Text style={[styles.notFoundSubtitle, { color: colors.icon }]}>
          This entry may have been deleted or the link is no longer valid.
        </Text>
        <TouchableOpacity
          style={[styles.goBackButton, { backgroundColor: colors.tint }]}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.goBackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Computed helpers
  // -------------------------------------------------------------------------

  const dateButtonLabel = selectedDate
    ? selectedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Select Birthday';

  const notesRemaining = MAX_NOTES_LENGTH - notes.length;

  // -------------------------------------------------------------------------
  // Render: Main edit form
  // -------------------------------------------------------------------------

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
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
          returnKeyType="next"
          autoCapitalize="words"
        />
        {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

        {/* ---------------------------------------------------------------- */}
        {/* Birthday field                                                    */}
        {/* ---------------------------------------------------------------- */}
        <Text style={[styles.label, { color: colors.text }]}>Birthday *</Text>
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

        {showDatePicker && (
          <>
            <DateTimePicker
              value={selectedDate ?? new Date(1990, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
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
          multiline
          textAlignVertical="top"
          returnKeyType="done"
        />
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
        {/* Action buttons                                                    */}
        {/* ---------------------------------------------------------------- */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.tint }]}
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="Save changes"
        >
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>

        {/*
         * The Delete button is styled differently (red outline, no fill) to
         * visually signal that it is a destructive action.
         */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete birthday"
        >
          <Text style={styles.deleteButtonText}>Delete Birthday</Text>
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
    paddingBottom: 40,
  },

  // ---- Centred placeholder screens (loading / not found) ------------------
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  notFoundSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  goBackButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  goBackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    height: 100,
    paddingTop: 12,
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

  // ---- Inline errors -------------------------------------------------------
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

  // ---- Delete button — outlined red (destructive action indicator) ---------
  deleteButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#DC3545',
  },
  deleteButtonText: {
    color: '#DC3545',
    fontSize: 17,
    fontWeight: '600',
  },
});
