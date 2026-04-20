/**
 * Group Gift Detail Screen — AF3
 *
 * Shows full details of a group gift campaign:
 *   • Gift description, captain, target vs. contributed, status
 *   • List of all contributions
 *   • "Add My Contribution" button/form
 *   • "Close Campaign" button for the captain
 *   • Progress bar when a targetAmount is set
 */

import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  BirthdayEntry,
  GroupGift,
  GroupGiftContribution,
} from '@/types/birthday';
import { generateId } from '@/utils/generateId';
import {
  addGroupGiftContribution,
  loadEntries,
  loadGroupGiftContributions,
  loadGroupGifts,
  updateGroupGift,
} from '@/utils/storage';

export default function GroupGiftDetailScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { id } = useLocalSearchParams<{ id: string }>();

  const [gift, setGift] = useState<GroupGift | null>(null);
  const [contributions, setContributions] = useState<GroupGiftContribution[]>([]);
  const [recipient, setRecipient] = useState<BirthdayEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Add contribution modal state
  const [showModal, setShowModal] = useState(false);
  const [contribName, setContribName] = useState('');
  const [contribAmount, setContribAmount] = useState('');
  const [contribItem, setContribItem] = useState('');
  const [contribNote, setContribNote] = useState('');
  const [contribNameError, setContribNameError] = useState('');

  // -------------------------------------------------------------------------
  // Load data
  // -------------------------------------------------------------------------

  useEffect(() => {
    const load = async () => {
      try {
        const [allGifts, allContribs, allEntries] = await Promise.all([
          loadGroupGifts(),
          loadGroupGiftContributions(),
          loadEntries(),
        ]);

        const found = allGifts.find((g) => g.id === id);
        if (!found) { setNotFound(true); return; }

        setGift(found);
        setContributions(allContribs.filter((c) => c.groupGiftId === id));
        setRecipient(allEntries.find((e) => e.id === found.birthdayEntryId) ?? null);
      } catch (err) {
        console.error('[GroupGiftDetail] Failed to load:', err);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const totalContributed = contributions.reduce((sum, c) => sum + (c.amount ?? 0), 0);

  const resetForm = () => {
    setContribName('');
    setContribAmount('');
    setContribItem('');
    setContribNote('');
    setContribNameError('');
  };

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleAddContribution = async () => {
    if (contribName.trim().length === 0) {
      setContribNameError('Your name is required.');
      return;
    }

    const amountNum = contribAmount.trim() ? parseFloat(contribAmount) : undefined;

    const contrib: GroupGiftContribution = {
      id: generateId(),
      groupGiftId: id,
      contributorName: contribName.trim(),
      amount: amountNum && !isNaN(amountNum) ? amountNum : undefined,
      item: contribItem.trim() || undefined,
      note: contribNote.trim() || undefined,
      addedAt: new Date().toISOString(),
    };

    try {
      await addGroupGiftContribution(contrib);
      setContributions((prev) => [...prev, contrib]);
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error('[GroupGiftDetail] Failed to add contribution:', err);
      Alert.alert('Save Failed', 'Could not save contribution. Please try again.', [{ text: 'OK' }]);
    }
  };

  const handleCloseGroupGift = () => {
    Alert.alert(
      'Close Group Gift',
      'Mark this group gift as closed? No further contributions can be added.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Group Gift',
          style: 'destructive',
          onPress: async () => {
            if (!gift) return;
            const updated: GroupGift = { ...gift, status: 'closed' };
            try {
              await updateGroupGift(updated);
              setGift(updated);
            } catch (err) {
              console.error('[GroupGiftDetail] Failed to close group gift:', err);
              Alert.alert('Error', 'Could not close the group gift. Please try again.', [{ text: 'OK' }]);
            }
          },
        },
      ],
    );
  };

  // -------------------------------------------------------------------------
  // Render states
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.icon }}>Loading…</Text>
      </View>
    );
  }

  if (notFound || !gift) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundTitle, { color: colors.text }]}>Group gift not found</Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.tint }]}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/group-gifts')}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isClosed = gift.status === 'closed';
  const progressPercent = gift.targetAmount
    ? Math.min((totalContributed / gift.targetAmount) * 100, 100)
    : 0;
  const goalMet = gift.targetAmount ? totalContributed >= gift.targetAmount : false;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Campaign header */}
        <View style={[styles.headerCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.recipientName, { color: colors.text }]}>
              🎁 {recipient?.name ?? 'Unknown'}
            </Text>
            {isClosed && (
              <View style={styles.closedBadge}>
                <Text style={styles.closedBadgeText}>Closed</Text>
              </View>
            )}
          </View>
          <Text style={[styles.giftDescription, { color: colors.text }]}>
            {gift.giftDescription}
          </Text>
          <Text style={[styles.captainLabel, { color: colors.icon }]}>
            Captain: {gift.captainName}
          </Text>

          {/* Target / contributed amounts */}
          <View style={styles.amountsRow}>
            <Text style={[styles.amountText, { color: colors.text }]}>
              ${totalContributed.toFixed(2)} contributed
            </Text>
            {gift.targetAmount ? (
              <Text style={[styles.amountText, { color: colors.icon }]}>
                {' '}of ${gift.targetAmount.toFixed(2)} goal
              </Text>
            ) : null}
          </View>

          {/* Progress bar */}
          {gift.targetAmount ? (
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: goalMet ? '#16A34A' : colors.tint,
                    width: `${progressPercent}%` as any,
                  },
                ]}
              />
            </View>
          ) : null}
          {goalMet && (
            <Text style={[styles.goalMetLabel, { color: '#16A34A' }]}>
              🎉 Goal reached!
            </Text>
          )}
        </View>

        {/* Contributions section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Contributions ({contributions.length})
        </Text>

        {contributions.length === 0 ? (
          <Text style={[styles.emptyContribs, { color: colors.icon }]}>
            No contributions yet. Be the first to contribute!
          </Text>
        ) : (
          contributions.map((c) => (
            <View
              key={c.id}
              style={[styles.contribCard, { backgroundColor: colors.cardBackground }]}
            >
              <Text style={[styles.contribName, { color: colors.text }]}>
                {c.contributorName}
              </Text>
              {c.amount !== undefined && (
                <Text style={[styles.contribAmount, { color: colors.tint }]}>
                  ${c.amount.toFixed(2)}
                </Text>
              )}
              {c.item ? (
                <Text style={[styles.contribDetail, { color: colors.icon }]}>
                  Item: {c.item}
                </Text>
              ) : null}
              {c.note ? (
                <Text style={[styles.contribDetail, { color: colors.icon }]}>
                  Note: {c.note}
                </Text>
              ) : null}
            </View>
          ))
        )}

        {/* Action buttons */}
        {!isClosed && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.tint }]}
            onPress={() => setShowModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Add my contribution"
          >
            <Text style={styles.addButtonText}>Add My Contribution</Text>
          </TouchableOpacity>
        )}

        {!isClosed && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleCloseGroupGift}
            accessibilityRole="button"
            accessibilityLabel="Close group gift"
          >
            <Text style={styles.closeButtonText}>Close Group Gift</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ------------------------------------------------------------------ */}
      {/* Add Contribution Modal                                              */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowModal(false); resetForm(); }}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Contribution</Text>
            <TouchableOpacity
              onPress={() => { setShowModal(false); resetForm(); }}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={[styles.modalClose, { color: colors.tint }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, { color: colors.text }]}>Your Name *</Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: contribNameError ? '#DC3545' : '#CCC' },
              ]}
              placeholder="e.g. Sam"
              placeholderTextColor={colors.icon}
              value={contribName}
              onChangeText={(t) => {
                setContribName(t);
                if (contribNameError && t.trim()) setContribNameError('');
              }}
              autoCapitalize="words"
            />
            {contribNameError ? <Text style={styles.errorText}>{contribNameError}</Text> : null}

            <Text style={[styles.label, { color: colors.text }]}>Amount (optional)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: '#CCC' }]}
              placeholder="e.g. 20.00"
              placeholderTextColor={colors.icon}
              value={contribAmount}
              onChangeText={setContribAmount}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.label, { color: colors.text }]}>Item / Non-monetary contribution (optional)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: '#CCC' }]}
              placeholder="e.g. wrapped it!"
              placeholderTextColor={colors.icon}
              value={contribItem}
              onChangeText={setContribItem}
              autoCapitalize="sentences"
            />

            <Text style={[styles.label, { color: colors.text }]}>Note (optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput, { color: colors.text, borderColor: '#CCC' }]}
              placeholder="Any additional notes…"
              placeholderTextColor={colors.icon}
              value={contribNote}
              onChangeText={setContribNote}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.tint, marginTop: 28, marginBottom: 40 }]}
              onPress={handleAddContribution}
              accessibilityRole="button"
              accessibilityLabel="Submit contribution"
            >
              <Text style={styles.addButtonText}>Add Contribution</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  backButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // ---- Header card ---------------------------------------------------------
  headerCard: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  recipientName: { fontSize: 20, fontWeight: '700' },
  closedBadge: { backgroundColor: '#9CA3AF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  closedBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  giftDescription: { fontSize: 17, fontWeight: '500', marginBottom: 4 },
  captainLabel: { fontSize: 13, marginBottom: 10 },
  amountsRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  amountText: { fontSize: 16, fontWeight: '600' },
  progressContainer: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBar: { height: '100%', borderRadius: 5 },
  goalMetLabel: { fontSize: 14, fontWeight: '600', marginTop: 2 },

  // ---- Contributions -------------------------------------------------------
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10 },
  emptyContribs: { fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginBottom: 16 },
  contribCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  contribName: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  contribAmount: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  contribDetail: { fontSize: 13, marginTop: 2 },

  // ---- Action buttons ------------------------------------------------------
  addButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  closeButton: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#DC3545',
  },
  closeButtonText: { color: '#DC3545', fontSize: 16, fontWeight: '600' },

  // ---- Modal ---------------------------------------------------------------
  modalContainer: { flex: 1, padding: 20, paddingTop: 48 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalClose: { fontSize: 16, fontWeight: '500' },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  notesInput: { height: 80, paddingTop: 12 },
  errorText: { color: '#DC3545', fontSize: 13, marginTop: 4 },
});
