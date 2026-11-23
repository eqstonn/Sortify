// Sortify Wrapped as a story: full-screen poster cards (components/wrapped/cards.tsx)
// with segmented progress bars at the top.
//   - Each card moves on by itself after 3 seconds (except the last).
//   - Tap the left third to go back, anywhere else to go forward.
//   - Hold anywhere to pause; let go to carry on.
// The last card is a summary poster with Share and Done.

import { setStatusBarStyle } from "expo-status-bar";
import { useFocusEffect } from "expo-router";
import { ShareIcon, X } from "lucide-react-native";
import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Share, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ActionButton from "@/components/ActionButton";
import Screen, { useNavSpace } from "@/components/Screen";
import {
  type CardProps, IntroCard, KgCard, MaterialCard, RankCard, RarestCard, SummaryCard, TotalCard,
} from "@/components/wrapped/cards";
import { StillContext } from "@/components/wrapped/motion";
import type { WrappedOut } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { useReduceMotion } from "@/lib/useReduceMotion";
import { type CardId, shareMessage, storyCards } from "@/lib/wrapped";
import { layout } from "@/theme";

export const CARD_MS = 3000;

// light: a pale card, so the bars, the close button and the status bar are dark
const CARDS: Record<CardId, { Card: ComponentType<CardProps>; light: boolean }> = {
  intro: { Card: IntroCard, light: false },
  total: { Card: TotalCard, light: true },
  material: { Card: MaterialCard, light: true },
  rarest: { Card: RarestCard, light: false },
  kg: { Card: KgCard, light: true },
  rank: { Card: RankCard, light: false },
  summary: { Card: SummaryCard, light: false },
};

export default function WrappedStory({ data, onClose }: { data: WrappedOut; onClose: () => void }) {
  const ids = useMemo(() => storyCards(data), [data]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const still = useReduceMotion();
  const insets = useSafeAreaInsets();
  const navSpace = useNavSpace();
  const { width, height } = useWindowDimensions();
  const P = useTheme().colors.wrapped;

  const id = ids[index];
  const { Card, light } = CARDS[id];
  const last = index === ids.length - 1;
  const ink = light ? P.deep : P.cream;
  const size = { w: Math.min(width, layout.maxContent), h: height };
  const inset = { top: insets.top + 64, bottom: navSpace };

  const go = useCallback((to: number) => setIndex(Math.max(0, Math.min(to, ids.length - 1))), [ids.length]);

  // The 3-second clock. Pausing keeps what's left, so letting go carries on from there.
  const clock = useRef({ index: -1, left: CARD_MS, since: 0 });
  useEffect(() => {
    if (clock.current.index !== index) clock.current = { index, left: CARD_MS, since: 0 };
    if (paused || last) return;
    clock.current.since = Date.now();
    const timer = setTimeout(() => go(index + 1), clock.current.left);
    return () => {
      clearTimeout(timer);
      clock.current.left -= Date.now() - clock.current.since;
    };
  }, [index, paused, last, go]);

  // Status bar icons light on dark cards, dark on pale ones; back to dark when you leave
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(light ? "dark" : "light");
      return () => setStatusBarStyle("dark");
    }, [light]),
  );

  // Hold to pause: a long press pauses, and letting go (after a long press) resumes
  const held = useRef(false);
  const zone = (step: number) => ({
    onPress: () => go(index + step),
    onLongPress: () => {
      held.current = true;
      setPaused(true);
    },
    onPressOut: () => {
      if (held.current) {
        held.current = false;
        setPaused(false);
      }
    },
    delayLongPress: 220,
  });

  const share = () => Share.share({ message: shareMessage(data) }).catch(() => {});

  return (
    <StillContext.Provider value={still}>
      <Screen edges={[]}>
        <View style={styles.fill} testID={`wrapped-${id}`}>
          {/* key: a new card mounts fresh, so its entrance plays every time you land on it */}
          <Card key={id} data={data} size={size} inset={inset} />

          <View style={styles.zones}>
            <Pressable style={styles.back} accessibilityRole="button" accessibilityLabel="Previous card" {...zone(-1)} />
            <Pressable style={styles.forward} accessibilityRole="button" accessibilityLabel="Next card" {...zone(1)} />
          </View>

          <View style={[styles.top, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
            <Progress count={ids.length} index={index} running={!paused} light={light} />
            <View style={styles.closeRow} pointerEvents="box-none">
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} style={styles.close}>
                <X size={26} color={ink} strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>

          {last ? (
            <View style={[styles.actions, { bottom: navSpace }]}>
              <ActionButton variant="secondary" label="Done" onPress={onClose} style={styles.done} />
              <ActionButton variant="accent" label="Share" icon={ShareIcon} onPress={share} style={styles.share} />
            </View>
          ) : null}
        </View>
      </Screen>
    </StillContext.Provider>
  );
}

/** One bar per card: done ones full, the current one filling over 3 s, the rest empty. */
function Progress({ count, index, running, light }: { count: number; index: number; running: boolean; light: boolean }) {
  const P = useTheme().colors.wrapped;
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.set(0);
  }, [index, fill]);
  useEffect(() => {
    if (running) fill.set(withTiming(1, { duration: (1 - fill.get()) * CARD_MS, easing: Easing.linear }));
    else cancelAnimation(fill);
  }, [running, index, fill]);

  const current = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
  const track = light ? P.inkFaint : P.creamFaint;
  const bar = light ? P.deep : P.cream;

  return (
    <View style={styles.bars} accessible accessibilityLabel={`Card ${index + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.bar, { backgroundColor: track }]}>
          {i < index ? <View style={[styles.barFill, styles.full, { backgroundColor: bar }]} /> : null}
          {i === index ? <Animated.View style={[styles.barFill, { backgroundColor: bar }, current]} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  zones: { ...StyleSheet.absoluteFill, flexDirection: "row" },
  back: { flex: 1 },
  forward: { flex: 2 },
  top: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 12, gap: 8 },
  bars: { flexDirection: "row", gap: 5 },
  bar: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 2 },
  full: { width: "100%" },
  closeRow: { flexDirection: "row", justifyContent: "flex-end" },
  close: { padding: 6 },
  actions: { position: "absolute", left: 20, right: 20, flexDirection: "row", gap: 10 },
  done: { flex: 1 },
  share: { flex: 1.4 },
});
