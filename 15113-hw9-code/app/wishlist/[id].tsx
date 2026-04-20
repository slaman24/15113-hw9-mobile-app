/**
 * Wishlist Screen — shows all wishlist items for a birthday entry.
 *
 * Navigated to from the Home screen by tapping "View Wishlist" on a card.
 * The entry `id` is passed as a route parameter.
 *
 * Users can claim unclaimed items by entering their name.
 */

import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
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
import { BirthdayEntry, WishlistItem } from '@/types/birthday';
import {
  loadEntries,
  loadWishlistForEntry,
  updateWishlistItem,
} from '@/utils/storage';

export default function WishlistScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { id } = useLocalSearchParams<{ id: string }>();

  const [entry, setEntry] = useState<BirthdayEntry | null>(null);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Claim modal state
  const [claimingItem, setClaimingItem] = useState<WishlistItem | null>(null);
  const [claimerName, setClaimerName] = useState('');
  const [claimerNameError, setClaimerNameError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const entries = await loadEntries();
        const found = entries.find((e) => e.id === id);
        if (!found) {
          setNotFound(true);
          return;
        }
        setEntry(found);
        const wishlist = await loadWishlistForEntry(id);
        setItems(wishlist);
      } catch (err) {
        console.error('[WishlistScreen] Failed to load:', err);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  const handleOpenUrl = (url: string) => {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    WebBrowser.openBrowserAsync(fullUrl).catch(() =>
      Linking.openURL(fullUrl).catch(() =>
        Alert.alert('Cannot Open Link', 'Unable to open this URL.', [{ text: 'OK' }])
      )
    );
  };

  const handleClaim = async () => {
    if (!claimingItem) return;
    if (claimerName.trim().length === 0) {
      setClaimerNameError('Please enter your name.');
      return;
    }

    const updated: WishlistItem = {
      ...claimingItem,
      claimedBy: claimerName.trim(),
      claimedAt: new Date().toISOString(),
    };

    try {
      await updateWishlistItem(updated);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setClaimingItem(null);
      setClaimerName('');
      setClaimerNameError('');
    } catch (err) {
      console.error('[WishlistScreen] Failed to claim item:', err);
      Alert.alert('Claim Failed', 'Could not save claim. Please try again.', [{ text: 'OK' }]);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.icon }}>Loading…</Text>
      </View>
    );
  }

  if (notFound || !entry) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundTitle, { color: colors.text }]}>Wishlist not found</Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.tint }]}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.screenSubtitle, { color: colors.icon }]}>
          {entry.name}'s wishlist
        </Text>

        {items.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.icon }]}>
            No wishlist items have been added yet.
          </Text>
        ) : (
          items.map((item, index) => {
            const accentColor = colors.cardAccents[index % colors.cardAccents.length];
            return (
              <View
                key={item.id}
                style={[styles.itemCard, { backgroundColor: accentColor }]}
              >
                <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>

                {item.url ? (
                  <TouchableOpacity onPress={() => handleOpenUrl(item.url!)}>
                    <Text style={[styles.itemUrl, { color: colors.tint }]} numberOfLines={1}>
                      {item.url}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {item.notes ? (
                  <Text style={[styles.itemNotes, { color: colors.icon }]}>{item.notes}</Text>
                ) : null}

                {item.claimedBy ? (
                  <Text style={[styles.claimedLabel, { color: '#16A34A' }]}>
                    🔒 Claimed by {item.claimedBy}
                  </Text>
                ) : (
                  <TouchableOpacity
                    style={[styles.claimButton, { backgroundColor: colors.tint }]}
                    onPress={() => setClaimingItem(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Claim ${item.title}`}
                  >
                    <Text style={styles.claimButtonText}>Claim</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Claim modal */}
      <Modal
        visible={!!claimingItem}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setClaimingItem(null);
          setClaimerName('');
          setClaimerNameError('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Claim Item</Text>
            <Text style={[styles.modalSubtitle, { color: colors.icon }]}>
              Enter your name to claim "{claimingItem?.title}"
            </Text>

            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: claimerNameError ? '#DC3545' : '#CCC' },
              ]}
              placeholder="Your name"
              placeholderTextColor={colors.icon}
              value={claimerName}
              onChangeText={(t) => {
                setClaimerName(t);
                if (claimerNameError && t.trim().length > 0) setClaimerNameError('');
              }}
              autoCapitalize="words"
            />
            {claimerNameError ? (
              <Text style={styles.errorText}>{claimerNameError}</Text>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: colors.tint }]}
                onPress={() => {
                  setClaimingItem(null);
                  setClaimerName('');
                  setClaimerNameError('');
                }}
              >
                <Text style={[styles.modalCancelText, { color: colors.tint }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, { backgroundColor: colors.tint }]}
                onPress={handleClaim}
              >
                <Text style={styles.modalConfirmText}>Claim</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  screenSubtitle: {
    fontSize: 15,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 32,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  itemCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  itemUrl: {
    fontSize: 13,
    marginBottom: 6,
    textDecorationLine: 'underline',
  },
  itemNotes: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  claimedLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 6,
  },
  claimButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Claim modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorText: {
    color: '#DC3545',
    fontSize: 13,
    marginTop: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
