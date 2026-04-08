/**
 * Confetti — a lightweight celebration overlay that plays when a birthday is saved.
 *
 * Built entirely with react-native-reanimated (already a project dependency) so
 * no extra packages are required.  Each piece is an Animated.Text node rendered
 * with a coloured Unicode shape character; the animation drives translateY,
 * translateX (sway), rotation, and opacity in parallel.
 *
 * Usage:
 *   <Confetti visible={showConfetti} onDone={() => doSomething()} />
 *
 * The component renders nothing when `visible` is false.  When it becomes true
 * (the component mounts), every piece starts animating.  The very last piece
 * calls `onDone` when its fade-out completes (~1.4 s after mount).
 *
 * pointerEvents="none" ensures the overlay never blocks touches beneath it.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Piece configuration
// ---------------------------------------------------------------------------

const PIECE_COUNT = 28;
const FALL_DURATION = 1400; // total ms from mount to last piece fading out

const COLORS = [
  '#FF6B9D', // pink
  '#A78BFA', // violet
  '#34D399', // mint
  '#FBBF24', // amber
  '#60A5FA', // sky
  '#FB923C', // orange
  '#F472B6', // rose
];

// Simple Unicode shapes render consistently with a `color` prop on all platforms
const CHARS = ['■', '●', '▲', '◆', '★', '♦', '▪'];

interface PieceConfig {
  startX: number;
  color: string;
  char: string;
  fontSize: number;
  delay: number;
  swayX: number;
}

/**
 * Piece positions are deterministic (no Math.random at runtime) so the layout
 * is stable and predictable each time confetti shows.
 */
const PIECES: PieceConfig[] = Array.from({ length: PIECE_COUNT }, (_, i) => ({
  // Spread evenly across 90 % of the screen width
  startX: SCREEN_W * (0.05 + 0.9 * (i / PIECE_COUNT)),
  color: COLORS[i % COLORS.length],
  char: CHARS[i % CHARS.length],
  // Vary size modulo 4 to get a mix of small and large pieces
  fontSize: 12 + (i % 4) * 5,
  // Stagger start times so pieces don't all fall at once
  delay: (i % 7) * 55,
  // Alternate left/right horizontal sway
  swayX: (i % 5 - 2) * 38,
}));

// ---------------------------------------------------------------------------
// Individual confetti piece
// ---------------------------------------------------------------------------

interface PieceProps extends PieceConfig {
  isLast: boolean;
  onDone?: () => void;
}

function ConfettiPiece({ startX, color, char, fontSize, delay, swayX, isLast, onDone }: PieceProps) {
  // Store onDone in a ref so the stable callback below always calls the latest value
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Stable function reference — safe to pass into runOnJS
  const notifyDone = useCallback(() => {
    onDoneRef.current?.();
  }, []);

  const duration = FALL_DURATION - delay;

  const y = useSharedValue(-30);
  const x = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Fall straight down
    y.value = withDelay(
      delay,
      withTiming(SCREEN_H + 30, { duration, easing: Easing.in(Easing.quad) }),
    );
    // Gentle side sway
    x.value = withDelay(delay, withTiming(swayX, { duration }));
    // Spin 1.5 full rotations
    rotate.value = withDelay(delay, withTiming(540, { duration }));
    // Fade out during the last 35 % of the piece's fall; the last piece calls onDone
    opacity.value = withDelay(
      delay + duration * 0.65,
      withTiming(0, { duration: duration * 0.35 }, (finished) => {
        'worklet';
        if (finished && isLast) {
          runOnJS(notifyDone)();
        }
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: y.value },
      { translateX: x.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text
      style={[
        {
          position: 'absolute',
          left: startX,
          top: 0,
          fontSize,
          lineHeight: fontSize + 6,
          color,
        },
        animStyle,
      ]}
    >
      {char}
    </Animated.Text>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface Props {
  /** When true the confetti starts playing.  Flip to false to hide instantly. */
  visible: boolean;
  /** Called once, ~1.4 s after becoming visible, when the last piece fades out. */
  onDone?: () => void;
}

export default function Confetti({ visible, onDone }: Props) {
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {PIECES.map((piece, i) => (
        <ConfettiPiece
          key={i}
          {...piece}
          isLast={i === PIECE_COUNT - 1}
          onDone={onDone}
        />
      ))}
    </View>
  );
}
