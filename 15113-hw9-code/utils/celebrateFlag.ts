/**
 * A simple module-level "consume once" flag used to signal that the Add
 * screen just saved a new birthday and the Home screen should play the
 * celebration animation when it next gains focus.
 *
 * Why not React state / Context?  The flag needs to survive a navigation
 * transition (Add → Home) while being read exactly once.  A module-level
 * variable is the simplest reliable mechanism for this without introducing a
 * state management library.
 *
 * Usage:
 *   // In add.tsx after a successful save:
 *   triggerCelebrate();
 *   router.replace('/(tabs)');
 *
 *   // In index.tsx inside useFocusEffect:
 *   if (consumeCelebrate()) setShowCelebration(true);
 */

let _pending = false;

/** Mark that a celebration should play on the next Home screen focus. */
export function triggerCelebrate(): void {
  _pending = true;
}

/**
 * Returns true (and clears the flag) if a celebration is pending.
 * Returns false if no celebration is queued.
 */
export function consumeCelebrate(): boolean {
  if (_pending) {
    _pending = false;
    return true;
  }
  return false;
}
