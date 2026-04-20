/**
 * Group Gifts Tab — AF3
 *
 * Lists all group gift campaigns (open and closed).
 * Open campaigns are shown in the main list; closed ones are in a
 * collapsible "Past Campaigns" section.
 *
 * A "+ New Campaign" button opens an in-screen modal form.
 * Tapping a campaign card navigates to the detail screen.
 */

import { useFocusEffect, router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
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
import { BirthdayEntry, GroupGift, GroupGiftContribution } from '@/types/birthday';
import { generateId } from '@/utils/generateId';
import { ensureSeeded } from '@/utils/seed';
import {
  addGroupGift,
  loadEntries,
  loadGroupGiftContributions,
  loadGroupGifts,
} from '@/utils/storage';

export default function GroupGiftsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [gifts, setGifts] = useState<GroupGift[]>([]);
  const [contributions, setContributions] = useState<GroupGiftContribution[]>([]);
  const [entries, setEntries] = useState<BirthdayEntry[]>([]);
  const [pastExpanded, setPastExpanded] = useState(false);

  // New campaign modal state
  const [showModal, setShowModal] = useState(false);
  const [newRecipientId, setNewRecipientId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newCaptain, setNewCaptain] = useState('');
  const [recipientError, setRecipientError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [captainError, setCaptainError] = useState('');

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        try {
          await ensureSeeded();
          const [giftsData, contribData, entriesData] = await Promise.all([
            loadGroupGifts(),
            loadGroupGiftContributions(),
            loadEntries(),
          ]);
          if (!active) return;
          setGifts(giftsData);
          setContributions(contribData);
          setEntries(entriesData);
        } catch (err) {
          console.error('[GroupGifts] Failed to load:', err);
        }
      };

      load();
      return () => { active = false; };
    }, []),
  );

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const getRecipientName = (birthdayEntryId: string): string => {
    const entry = entries.find((e) => e.id === birthdayEntryId);
    return entry?.name ?? 'Unknown';
  };

  const getTotalContributed = (giftId: string): number =>
    contributions
      .filter((c) => c.groupGiftId === giftId)
      .reduce((sum, c) => sum + (c.amount ?? 0), 0);

  const getContributorCount = (giftId: string): number =>
    contributions.filter((c) => c.groupGiftId === giftId).length;

  // -------------------------------------------------------------------------
  // New campaign form
  // -------------------------------------------------------------------------

  const resetForm = () => {
    setNewRecipientId('');
    setNewDescription('');
    setNewTarget('');
    setNewCaptain('');
    setRecipientError('');
    setDescriptionError('');
    setCaptainError('');
  };

  const handleCreateGroupGift = async () => {
    let valid = true;
    if (!newRecipientId) { setRecipientError('Please select a recipient.'); valid = false; }
    if (newDescription.trim().length === 0) { setDescriptionError('Gift description is required.'); valid = false; }
    if (newCaptain.trim().length === 0) { setCaptainError('Captain name is required.'); valid = false; }
    if (!valid) return;

    const targetNum = newTarget.trim() ? parseFloat(newTarget) : undefined;

    const gift: GroupGift = {
      id: generateId(),
      birthdayEntryId: newRecipientId,
      giftDescription: newDescription.trim(),
      targetAmount: targetNum && !isNaN(targetNum) ? targetNum : undefined,
      captainName: newCaptain.trim(),
      createdAt: new Date().toISOString(),
      status: 'open',
    };

    try {
      await addGroupGift(gift);
      setGifts((prev) => [...prev, gift]);
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error('[GroupGifts] Failed to save group gift:', err);
      Alert.alert('Save Failed', 'Could not save group gift. Please try again.', [{ text: 'OK' }]);
    }
  };

  // -------------------------------------------------------------------------
  // Render a single campaign card
  // -------------------------------------------------------------------------

  const renderGroupGiftCard = (gift: GroupGift) => {
    const recipientName = getRecipientName(gift.birthdayEntryId);
    const total = getTotalContributed(gift.id);
    const count = getContributorCount(gift.id);
    const accentColor = colors.cardAccents[
      gifts.indexOf(gift) % colors.cardAccents.length
    ];

    return (
      <TouchableOpacity
        key={gift.id}
        style={[styles.card, { backgroundColor: accentColor }]}
        onPress={() => router.push(`/group-gift/${gift.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Group gift for ${recipientName}: ${gift.giftDescription}`}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardRecipient, { color: colors.text }]}>
            🎁 {recipientName}
          </Text>
          {gift.status === 'closed' && (
            <View style={styles.closedBadge}>
              <Text style={styles.closedBadgeText}>Closed</Text>
            </View>
          )}
        </View>
        <Text style={[styles.cardGift, { color: colors.text }]}>{gift.giftDescription}</Text>
        <Text style={[styles.cardCaptain, { color: colors.icon }]}>
          Captain: {gift.captainName}
        </Text>
        <Text style={[styles.cardStats, { color: colors.icon }]}>
          {count} contributor{count !== 1 ? 's' : ''}{' '}
          {gift.targetAmount
            ? `· $${total.toFixed(2)} / $${gift.targetAmount.toFixed(2)}`
            : total > 0
            ? `· $${total.toFixed(2)} contributed`
            : ''}
        </Text>

        {/* Progress bar */}
        {gift.targetAmount ? (
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  backgroundColor: total >= gift.targetAmount ? '#16A34A' : colors.tint,
                  width: `${Math.min((total / gift.targetAmount) * 100, 100)}%` as any,
                },
              ]}
            />
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const openGifts = gifts.filter((g) => g.status === 'open');
  const closedGifts = gifts.filter((g) => g.status === 'closed');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={openGifts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderGroupGiftCard(item)}
        contentContainerStyle={
          openGifts.length === 0 && closedGifts.length === 0
            ? styles.emptyContainer
            : styles.listContent
        }
        ListHeaderComponent={
          openGifts.length === 0 && closedGifts.length === 0 ? null : (
            <TouchableOpacity
              style={[styles.newButton, { backgroundColor: colors.tint }]}
              onPress={() => setShowModal(true)}
              accessibilityRole="button"
              accessibilityLabel="New group gift"
            >
              <Text style={styles.newButtonText}>+ New Group Gift</Text>
            </TouchableOpacity>
          )
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No group gifts yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.icon }]}>
              Coordinate a group gift for someone special.
            </Text>
            <TouchableOpacity
              style={[styles.newButton, { backgroundColor: colors.tint, marginTop: 20 }]}
              onPress={() => setShowModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Start a new group gift"
            >
              <Text style={styles.newButtonText}>+ New Group Gift</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          closedGifts.length > 0 ? (
            <View>
              <TouchableOpacity
                style={[styles.pastHeader, { borderTopColor: colors.icon }]}
                onPress={() => setPastExpanded((p) => !p)}
                accessibilityRole="button"
                accessibilityLabel={pastExpanded ? 'Collapse past group gifts' : 'Expand past group gifts'}
              >
                <Text style={[styles.pastHeaderText, { color: colors.icon }]}>
                  Past Group Gifts ({closedGifts.length}) {pastExpanded ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>
              {pastExpanded && closedGifts.map((g) => renderGroupGiftCard(g))}
            </View>
          ) : null
        }
      />

      {/* ------------------------------------------------------------------ */}
      {/* New Campaign Modal                                                  */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowModal(false); resetForm(); }}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Campaign</Text>
            <TouchableOpacity
              onPress={() => { setShowModal(false); resetForm(); }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={[styles.modalClose, { color: colors.tint }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {/* Recipient picker */}
            <Text style={[styles.label, { color: colors.text }]}>Recipient *</Text>
            <Text style={[styles.sublabel, { color: colors.icon }]}>
              Select from your birthday entries:
            </Text>
            <View style={styles.recipientList}>
              {entries.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  style={[
                    styles.recipientChip,
                    newRecipientId === e.id && { backgroundColor: colors.tint, borderColor: colors.tint },
                    newRecipientId !== e.id && { borderColor: colors.icon },
                  ]}
                  onPress={() => {
                    setNewRecipientId(e.id);
                    setRecipientError('');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${e.name}`}
                >
                  <Text
                    style={{
                      color: newRecipientId === e.id ? '#fff' : colors.text,
                      fontWeight: '500',
                    }}
                  >
                    {e.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {recipientError ? <Text style={styles.errorText}>{recipientError}</Text> : null}

            {/* Gift description */}
            <Text style={[styles.label, { color: colors.text }]}>Gift Description *</Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: descriptionError ? '#DC3545' : '#CCC' },
              ]}
              placeholder="e.g. Kindle Paperwhite"
              placeholderTextColor={colors.icon}
              value={newDescription}
              onChangeText={(t) => { setNewDescription(t); if (descriptionError && t.trim()) setDescriptionError(''); }}
              autoCapitalize="sentences"
            />
            {descriptionError ? <Text style={styles.errorText}>{descriptionError}</Text> : null}

            {/* Target amount */}
            <Text style={[styles.label, { color: colors.text }]}>Target Amount (optional)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: '#CCC' }]}
              placeholder="e.g. 120.00"
              placeholderTextColor={colors.icon}
              value={newTarget}
              onChangeText={setNewTarget}
              keyboardType="decimal-pad"
            />

            {/* Captain name */}
            <Text style={[styles.label, { color: colors.text }]}>Your Name (Captain) *</Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: captainError ? '#DC3545' : '#CCC' },
              ]}
              placeholder="e.g. Jamie"
              placeholderTextColor={colors.icon}
              value={newCaptain}
              onChangeText={(t) => { setNewCaptain(t); if (captainError && t.trim()) setCaptainError(''); }}
              autoCapitalize="words"
            />
            {captainError ? <Text style={styles.errorText}>{captainError}</Text> : null}

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.tint }]}
              onPress={handleCreateGroupGift}
              accessibilityRole="button"
              accessibilityLabel="Create group gift"
            >
              <Text style={styles.saveButtonText}>Create Group Gift</Text>
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
  listContent: { padding: 16, gap: 12 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: 32 },
  emptyState: { alignItems: 'center' },
  emptyTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  newButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  newButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // ---- Campaign card -------------------------------------------------------
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardRecipient: { fontSize: 17, fontWeight: '700' },
  closedBadge: {
    backgroundColor: '#9CA3AF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  closedBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  cardGift: { fontSize: 15, marginBottom: 4 },
  cardCaptain: { fontSize: 13, marginBottom: 4 },
  cardStats: { fontSize: 13, marginBottom: 8 },

  progressContainer: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  progressBar: { height: '100%', borderRadius: 4 },

  // ---- Past campaigns -------------------------------------------------------
  pastHeader: {
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
    alignItems: 'center',
  },
  pastHeaderText: { fontSize: 14, fontWeight: '600' },

  // ---- Modal ---------------------------------------------------------------
  modalContainer: { flex: 1, padding: 20, paddingTop: 48 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalClose: { fontSize: 16, fontWeight: '500' },

  label: { fontSize: 15, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  sublabel: { fontSize: 13, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorText: { color: '#DC3545', fontSize: 13, marginTop: 4 },

  recipientList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  recipientChip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },

  saveButton: {
    marginTop: 28,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
