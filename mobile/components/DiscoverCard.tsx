// Home's "Discover weekly" card: this week's tricky item, where it goes, and its bonus.

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { binLabel } from "@/components/BinCard";
import type { DiscoverOut } from "@/lib/api";
import { binColors, colors, fonts, radius, spacing, type } from "@/theme";

export default function DiscoverCard({ discover }: { discover: DiscoverOut }) {
  return (
    <View style={styles.card} testID="discover-card">
      <View style={styles.top}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="compass-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.title}>
          <Text style={type.label}>DISCOVER WEEKLY</Text>
          <Text style={type.heading}>{discover.item}</Text>
        </View>
        {discover.found ? (
          <View style={[styles.pill, styles.foundPill]}>
            <Text style={[styles.pillText, { color: colors.primary }]}>Found ✓</Text>
          </View>
        ) : (
          <View style={styles.pill}>
            <Text style={styles.pillText}>+{discover.bonus_points} pts</Text>
          </View>
        )}
      </View>

      <Text style={type.body}>{discover.explainer}</Text>

      <View style={styles.bottom}>
        <View testID="discover-bin" style={[styles.bin, { backgroundColor: binColors[discover.bin] }]}>
          <Text style={styles.binText}>{binLabel(discover.bin)}</Text>
        </View>
        <Text style={[type.caption, styles.hint]}>
          {discover.found ? "Bonus collected this week. Nice!" : "Scan one this week for the bonus."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  title: { flex: 1 },
  pill: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  foundPill: { backgroundColor: colors.primarySoft },
  pillText: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.onPrimary },
  bottom: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  bin: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  binText: { fontFamily: fonts.bold, fontSize: 12, color: colors.onPrimary },
  hint: { flex: 1 },
});
