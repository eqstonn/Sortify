// Me: the profile from docs/mockups/03-profile.png. Name and level, four stat
// tiles, "What you sort" bars and badges, all from GET /me.

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Placeholder from "@/components/Placeholder";
import { api, ApiError, type BadgeOut, type MaterialShare, type ProfileOut } from "@/lib/api";
import { avatarEmoji } from "@/lib/avatars";
import { kgText, plural } from "@/lib/format";
import { materialColor, materialLabel } from "@/lib/materials";
import { colors, fonts, radius, spacing, type } from "@/theme";

type Status = { state: "loading" } | { state: "ok"; profile: ProfileOut } | { state: "error"; message: string };

// Badge ids from app/services/badges.py
const BADGE_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  first_sort: "sprout",
  ewaste_hero: "cellphone",
  streak_7: "fire",
  glass_master: "bottle-wine",
};

export default function Me() {
  const [status, setStatus] = useState<Status>({ state: "loading" });

  // Reload when the tab comes into view, so a new scan or badge shows up
  useFocusEffect(
    useCallback(() => {
      api.me().then(
        (profile) => setStatus({ state: "ok", profile }),
        (e) => setStatus({ state: "error", message: e instanceof ApiError || e instanceof Error ? e.message : String(e) }),
      );
    }, []),
  );

  if (status.state === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (status.state === "error") {
    return (
      <Placeholder eyebrow="Profile" title="Couldn't load your profile">
        <Text style={type.body}>{status.message}</Text>
      </Placeholder>
    );
  }

  const p = status.profile;
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>{avatarEmoji(p.avatar)}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={type.title}>{p.name}</Text>
            <Text style={type.caption}>
              Level {p.level.number} {p.level.name}
            </Text>
          </View>
        </View>

        <View style={styles.tiles}>
          <StatTile value={p.total_points.toLocaleString()} label="total points" highlight />
          <StatTile value={p.items_sorted.toLocaleString()} label="items sorted" />
          <StatTile value={kgText(p.kg_diverted)} label="kept out of landfill" />
          <StatTile value={plural(p.longest_streak, "day")} label="longest streak" />
        </View>

        <View style={styles.card}>
          <Text style={type.heading}>What you sort</Text>
          {p.breakdown.length ? (
            <Breakdown rows={p.breakdown} />
          ) : (
            <Text style={type.caption}>Scan your first item to see what you sort.</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={type.heading}>Badges</Text>
            <Text style={type.caption}>
              {p.badges.filter((b) => b.earned).length} of {p.badges.length}
            </Text>
          </View>
          <View style={styles.badges}>
            {p.badges.map((b) => (
              <Badge key={b.id} badge={b} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({ value, label, highlight }: { value: string; label: string; highlight?: boolean }) {
  const color = highlight ? colors.onPrimary : colors.text;
  return (
    <View style={[styles.tile, highlight && { backgroundColor: colors.primary }]}>
      <Text style={[styles.tileValue, { color }]}>{value}</Text>
      <Text style={[type.caption, highlight && { color }]}>{label}</Text>
    </View>
  );
}

function Breakdown({ rows }: { rows: MaterialShare[] }) {
  const most = Math.max(...rows.map((r) => r.count)); // the top material fills the bar
  return (
    <View style={styles.bars}>
      {rows.map((r) => (
        <View key={r.material} style={styles.barRow}>
          <Text style={[type.body, styles.barLabel]}>{materialLabel(r.material)}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(100 * r.count) / most}%`, backgroundColor: materialColor(r.material) }]} />
          </View>
          <Text style={[type.body, styles.barCount]}>{r.count}</Text>
        </View>
      ))}
    </View>
  );
}

function Badge({ badge }: { badge: BadgeOut }) {
  return (
    <View
      style={styles.badge}
      accessible
      accessibilityLabel={`${badge.name}, ${badge.earned ? "earned" : `locked. ${badge.description}`}`}
    >
      <View style={[styles.badgeCircle, badge.earned ? styles.badgeEarned : styles.badgeLocked]}>
        <MaterialCommunityIcons
          name={badge.earned ? (BADGE_ICONS[badge.id] ?? "star-four-points") : "lock"}
          size={24}
          color={badge.earned ? colors.primary : colors.textMuted}
        />
      </View>
      <Text style={[type.caption, styles.badgeName]} numberOfLines={2}>
        {badge.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md },

  header: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginBottom: spacing.sm },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primaryBorder, alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 34 },
  headerText: { flex: 1 },

  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: { flexBasis: "48%", flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg, gap: 2 },
  tileValue: { fontFamily: fonts.extrabold, fontSize: 26 },

  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  bars: { gap: spacing.sm },
  barRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  barLabel: { width: 84 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.track, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  barCount: { width: 32, textAlign: "right", fontFamily: fonts.bold },

  badges: { flexDirection: "row", justifyContent: "space-between" },
  badge: { flex: 1, alignItems: "center", gap: spacing.xs },
  badgeCircle: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  badgeEarned: { backgroundColor: colors.primarySoft },
  badgeLocked: { borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.primaryBorder },
  badgeName: { textAlign: "center", fontSize: 11 },
});
