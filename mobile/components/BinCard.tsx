// The big coloured "Put it in the Blue bin" card from 05-scan-result.png. Its colour is the bin's.

import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import type { Bin } from "@/lib/api";
import { binColors, colors, fonts, radius, spacing } from "@/theme";

const BINS: Record<Bin, { eyebrow: string; label: string; icon: keyof typeof Feather.glyphMap }> = {
  blue_bin: { eyebrow: "Put it in the", label: "Blue bin", icon: "trash-2" },
  black_bin: { eyebrow: "Put it in the", label: "Black bin", icon: "trash-2" },
  green_bin: { eyebrow: "Put it in the", label: "Green bin", icon: "trash-2" },
  garbage: { eyebrow: "Put it in the", label: "Garbage", icon: "trash" },
  dropoff: { eyebrow: "Take it to a", label: "Drop-off", icon: "map-pin" },
  unsure: { eyebrow: "We're", label: "Not sure", icon: "help-circle" },
};

export function binLabel(bin: Bin): string {
  return BINS[bin].label;
}

export default function BinCard({ bin, detail }: { bin: Bin; detail?: string }) {
  const { eyebrow, label, icon } = BINS[bin];
  return (
    <View testID="bin-card" style={[styles.card, { backgroundColor: binColors[bin] }]}>
      <View style={styles.icon}>
        <Feather name={icon} size={26} color={colors.onPrimary} />
      </View>
      <View style={styles.text}>
        <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
        <Text style={styles.label}>{label}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.5, color: colors.onPrimary, opacity: 0.85 },
  label: { fontFamily: fonts.extrabold, fontSize: 30, color: colors.onPrimary, lineHeight: 36 },
  detail: { fontFamily: fonts.semibold, fontSize: 13, color: colors.onPrimary, opacity: 0.9 },
});
