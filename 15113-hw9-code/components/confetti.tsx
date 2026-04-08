/**
 * Confetti — celebration overlay rendered on the Home screen after a birthday
 * is saved.
 *
 * Pieces burst in from all four screen edges simultaneously, cross the screen,
 * and fade out.  A celebration message scales in at the centre.  The whole
 * overlay auto-dismisses (~2.2 s) and then calls `onDone`.
 *
 * Built entirely with react-native-reanimated (already a project dependency).
 * pointerEvents="none" ensures the overlay never blocks touches beneath it.
 *
 * Usage:
 *   <Confetti visible={showCelebration} onDone={() => setShowCelebration(false)} />
 *
 * The component renders nothing when `visible` is false, which causes a full
 * unmount of all piece sub-components so every burst starts fresh.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Timing constants (ms)
// ---------------------------------------------------------------------------

const TRAVEL = 1400;    // how long each piece takes to cross the screen
const MSG_IN = 400;     // message fade-in duration
const MSG_HOLD = 1200;  // how long the message stays at full opacity
const MSG_OUT = 600;    // message fade-out duration (onDone fires at the end)

// ---------------------------------------------------------------------------
// Piece palette
// ---------------------------------------------------------------------------

const COLORS = ['#FF6B9D', '#A78BFA', '#34D399', '#FBBF24', '#60A5FA', '#FB923C', '#F472B6', '#E879F9'];
const CHARS  = ['■', '●', '▲', '◆', '★', '♦', '▪'];

// ---------------------------------------------------------------------------
// Deterministic piece layout (computed once at module load)
// ---------------------------------------------------------------------------

interface PieceConfig {
  startX: number;
  startY: number;
  endX:   number;
  endY:   number;
  color:  string;
  char:   string;
  fontSize: number;
  delay:  number;
  rotateTo: number;
}

function makePieces(): PieceConfig[] {
  const pieces: PieceConfig[] = [];
  const N = 9; // pieces per edge  →  36 total

  // Top edge → fall down across the full screen height
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    pieces.push({
      startX: SCREEN_W * (0.05 + 0.9 * t),
      startY: -40,
      endX:   SCREEN_W * (0.05 + 0.9 * t) + (i % 5 - 2) * 50,
      endY:   SCREEN_H + 40,
      color:  COLORS[i % COLORS.length],
      char:   CHARS[i % CHARS.length],
      fontSize: 10 + (i % 4) * 5,
      delay:  (i % 6) * 55,
      rotateTo: (i % 2 === 0 ? 1 : -1) * 480,
    });
  }

  // Bottom edge → fly up
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    pieces.push({
      startX: SCREEN_W * (0.05 + 0.9 * t),
      startY: SCREEN_H + 40,
      endX:   SCREEN_W * (0.05 + 0.9 * t) + (i % 5 - 2) * 50,
      endY:   -40,
      color:  COLORS[(i + 3) % COLORS.length],
      char:   CHARS[(i + 2) % CHARS.length],
      fontSize: 10 + (i % 4) * 5,
      delay:  (i % 5) * 65,
      rotateTo: (i % 2 === 0 ? -1 : 1) * 480,
    });
  }

  // Left edge → fly right
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    pieces.push({
      startX: -40,
      startY: SCREEN_H * (0.1 + 0.8 * t),
      endX:   SCREEN_W + 40,
      endY:   SCREEN_H * (0.1 + 0.8 * t) + (i % 5 - 2) * 50,
      color:  COLORS[(i + 5) % COLORS.length],
      char:   CHARS[(i + 3) % CHARS.length],
      fontSize: 10 + (i % 3) * 5,
      delay:  (i % 4) * 70,
      rotateTo: (i % 2 === 0 ? 1 : -1) * 360,
    });
  }

  // Right edge → fly left
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    pieces.push({
      startX: SCREEN_W + 40,
      startY: SCREEN_H * (0.1 + 0.8 * t),
      endX:   -40,
      endY:   SCREEN_H * (0.1 + 0.8 * t) + (i % 5 - 2) * 50,
      color:  COLORS[(i + 2) % COLORS.length],
      char:   CHARS[(i + 4) % CHARS.length],
      fontSize: 10 + (i % 3) * 5,
      delay:  (i % 6) * 60,
      rotateTo: (i % 2 === 0 ? -1 : 1) * 360,
    });
  }

  return pieces;
}

const PIECES = makePieces();

// ---------------------------------------------------------------------------
// Individual confetti piece
// ---------------------------------------------------------------------------

function ConfettiPiece({ piece }: { piece: PieceConfig }) {
  // Each piece starts at its edge position and travels to the opposite side.
  // `position: absolute; left: 0; top: 0` + translateX/Y places it precisely.
  const x = useSharedValue(piece.startX);
  const y = useSharedValue(piece.startY);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    x.value      = piece.delay > 0
      ? (() => { x.value = piece.startX; return withTiming(piece.endX, { duration: TRAVEL }) })()
      : withTiming(piece.endX, { duration: TRAVEL });
    y.value      = withTiming(piece.endY,      { duration: TRAVEL });
    rotate.value = withTiming(piece.rotateTo,  { duration: TRAVEL });
    opacity.value = withSequence(
      withTiming(1, { duration: TRAVEL * 0.7 }),
      withTiming(0, { duration: TRAVEL * 0.3 }),
    );

    // Stagger start: cancel and restart with a delay
    if (piece.delay > 0) {
      x.value = piece.startX;
      y.value = piece.startY;
      rotate.value = 0;
      opacity.value = 0;

      const t = setTimeout(() => {
        x.value      = withTiming(piece.endX,     { duration: TRAVEL });
        y.value      = withTiming(piece.endY,     { duration: TRAVEL });
        rotate.value = withTiming(piece.rotateTo, { duration: TRAVEL });
        opacity.value = withSequence(
          withTiming(1, { duration: TRAVEL * 0.7 }),
          withTiming(0, { duration: TRAVEL * 0.3 }),
        );
      }, piece.delay);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[{ fontSize: piece.fontSize, color: piece.color }, style]}>
      {piece.char}
    </Animated.Text>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface Props {
  /** When true the overlay mounts and the animation plays. */
  visible: boolean;
  /** Called ~2.2 s after mounting, once the message has fully faded out. */
  onDone?: () => void;
}

export default function Confetti({ visible, onDone }: Props) {
  // Keep onDone in a ref so the animated callback always calls the latest value
  // without needing to be in the dependency array.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const notify = useCallback(() => { onDoneRef.current?.(); }, []);

  // Message animation shared values
  const msgOpacity = useSharedValue(0);
  const msgScale   = useSharedValue(0.6);

  useEffect(() => {
    if (!visible) return;

    // Reset to start state (handles re-plays)
    msgOpacity.value = 0;
    msgScale.value   = 0.6;

    // Fade in → hold → fade out; call onDone when fade-out finishes
    msgOpacity.value = withSequence(
      withTiming(1, { duration: MSG_IN }),
      withTiming(1, { duration: MSG_HOLD }),   // hold at full opacity
      withTiming(0, { duration: MSG_OUT }, (finished) => {
        'worklet';
        if (finished) runOnJS(notify)();
      }),
    );
    msgScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: msgOpacity.value * 0.55,
  }));

  const msgStyle = useAnimatedStyle(() => ({
    opacity: msgOpacity.value,
    transform: [{ scale: msgScale.value }],
  }));

  // Returning null unmounts all ConfettiPiece children (resetting their
  // shared values) so the next burst always starts from the edges.
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Confetti pieces from all four edges */}
      {PIECES.map((piece, i) => (
        <ConfettiPiece key={i} piece={piece} />
      ))}

      {/* Dark backdrop — improves legibility of the message */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />

      {/* Celebration message */}
      <Animated.View style={[styles.messageContainer, msgStyle]}>
        <Text style={styles.messageText}>🎉 You have someone new{'\n'}to celebrate! 🎊</Text>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: '#000',
  },
  messageContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  messageText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 36,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
});
