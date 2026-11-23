// The glass "+15 pts" pill that drops in on Home after "I recycled it", then hides itself.
// Enters with a fade and a 12 px rise (300 ms), leaves faster (150 ms). Reduce Motion: fade only.

import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassLayers } from "@/components/GlassCard";
import type { PointsToastData } from "@/lib/pointsToast";
import { makeStyles, useTheme } from "@/lib/theme";
import { useReduceMotion } from "@/lib/useReduceMotion";
import { fonts, layout, motion, radius, spacing } from "@/theme";

const SHOW_FOR_MS = 3500;

export default function PointsToast({ toast, onHide }: { toast: PointsToastData | null; onHide: () => void }) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const { colors } = useTheme();
  const s = useStyles();
  const [shown] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!toast) return;
    shown.setValue(0);
    Animated.timing(shown, { toValue: 1, duration: motion.enterMs, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(shown, { toValue: 0, duration: motion.exitMs, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() =>
        onHide(),
      );
    }, SHOW_FOR_MS);
    return () => clearTimeout(timer);
  }, [toast, shown, onHide]);

  if (!toast) return null;

  const earned = toast.points > 0;
  const move = reduce ? [] : [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }];
  return (
    <Animated.View accessibilityRole="alert" style={[s.toast, { top: insets.top + spacing.sm, opacity: shown, transform: move }]}>
      <GlassLayers strong />
      <View style={s.badge}>
        <Feather name={earned ? "award" : "check"} size={20} color={colors.onAccent} />
      </View>
      <View style={s.text}>
        <Text style={s.points}>{earned ? `+${toast.points} pts` : "Thanks for sorting!"}</Text>
        <Text style={s.caption}>{toast.notes[0] ?? `You're at ${toast.total.toLocaleString()} points`}</Text>
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  toast: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    maxWidth: layout.maxContent - spacing.lg * 2,
    alignSelf: "center",
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: "hidden",
    padding: spacing.md,
  },
  badge: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  text: { flex: 1 },
  points: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.accent },
  caption: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
}));
