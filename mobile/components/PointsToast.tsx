// The "+15 pts" pill that drops in on Home after "I recycled it", then hides itself.

import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { PointsToastData } from "@/lib/pointsToast";
import { colors, fonts, radius, spacing } from "@/theme";

const SHOW_FOR_MS = 3500;

export default function PointsToast({ toast, onHide }: { toast: PointsToastData | null; onHide: () => void }) {
  const insets = useSafeAreaInsets();
  const [slide] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!toast) return;
    slide.setValue(0);
    Animated.spring(slide, { toValue: 1, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(slide, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onHide());
    }, SHOW_FOR_MS);
    return () => clearTimeout(timer);
  }, [toast, slide, onHide]);

  if (!toast) return null;

  const earned = toast.points > 0;
  return (
    <Animated.View
      accessibilityRole="alert"
      style={[
        styles.toast,
        { top: insets.top + spacing.sm },
        { opacity: slide, transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
      ]}
    >
      <View style={styles.badge}>
        <Feather name={earned ? "award" : "check"} size={20} color={colors.onPrimary} />
      </View>
      <View style={styles.text}>
        <Text style={styles.points}>{earned ? `+${toast.points} pts` : "Thanks for sorting!"}</Text>
        <Text style={styles.caption}>
          {toast.notes[0] ?? `You're at ${toast.total.toLocaleString()} points`}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1 },
  points: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.primary },
  caption: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
});
