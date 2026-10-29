// Board, from docs/mockups/02-leaderboard.png: This week / All time tabs, a
// podium for the top 3, the rest of the top 20 below, and your own row pinned
// at the bottom even when you're outside the top 20. From GET /leaderboard.

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Chips from "@/components/Chips";
import LeaderRow from "@/components/LeaderRow";
import { ErrorState, Loading } from "@/components/ScreenState";
import { api, type LeaderboardEntry, type LeaderboardRange } from "@/lib/api";
import { avatarEmoji } from "@/lib/avatars";
import { boardSubtitle } from "@/lib/format";
import { useLoad } from "@/lib/useLoad";
import { colors, fonts, podiumColors, radius, spacing, type } from "@/theme";

const RANGES: { value: LeaderboardRange; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "all", label: "All time" },
];

export default function Board() {
  const [range, setRange] = useState<LeaderboardRange>("week");
  const load = useCallback(() => api.leaderboard(range), [range]);
  const { status, refreshing, refresh, retry } = useLoad(load);

  if (status.state === "loading") return <Loading />;
  if (status.state === "error") return <ErrorState title="Couldn't load the board" message={status.message} onRetry={retry} />;

  const board = status.data;
  const switching = board.range !== range; // the other tab's data is still on its way
  const podium = board.entries.slice(0, 3);
  const rest = board.entries.slice(3);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        testID="board-scroll"
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <Text style={type.caption}>{boardSubtitle(range)}</Text>
        <Text style={type.title}>Top charts</Text>
        <Chips options={RANGES} value={range} onChange={setRange} label="Leaderboard range" />

        {switching ? (
          <ActivityIndicator color={colors.primary} style={styles.switching} />
        ) : board.entries.length === 0 ? (
          <View style={styles.card}>
            <Text style={type.heading}>No one’s on the board yet</Text>
            <Text style={type.body}>
              {range === "week" ? "Nobody has sorted anything this week." : "Nobody has sorted anything yet."} Scan an
              item to take #1!
            </Text>
          </View>
        ) : (
          <>
            <Podium top={podium} />
            {rest.length ? (
              <View style={styles.card}>
                {rest.map((e) => (
                  <LeaderRow key={e.user_id} entry={e} />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {!switching ? (
        <View style={styles.pinned}>
          {board.me ? (
            <LeaderRow
              entry={board.me}
              subtitle={board.entries.some((e) => e.is_me) ? undefined : "Keep sorting to reach the top 20"}
            />
          ) : (
            <View style={styles.notRanked} testID="not-ranked">
              <Text style={type.body}>You’re not on the board yet. Sort an item to get ranked!</Text>
            </View>
          )}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

// #2, #1, #3 left to right, with #1 raised, crowned and green
function Podium({ top }: { top: LeaderboardEntry[] }) {
  const order = [1, 0, 2];
  return (
    <View style={styles.podium} testID="podium">
      {order.map((i) => {
        const e = top[i];
        if (!e) return <View key={i} style={styles.place} />;
        const first = i === 0;
        return (
          <View key={e.user_id} style={styles.place} accessible accessibilityLabel={`Place ${i + 1}: ${e.is_me ? "You" : e.name}, ${e.points} points`}>
            {first ? <MaterialCommunityIcons name="crown" size={26} color={podiumColors[0]} /> : null}
            <View style={[styles.podiumAvatar, first && styles.podiumAvatarFirst, { borderColor: podiumColors[i] }]}>
              <Text style={{ fontSize: first ? 30 : 24 }}>{avatarEmoji(e.avatar)}</Text>
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>
              {e.is_me ? "You" : e.name}
            </Text>
            <View style={[styles.block, first ? styles.blockFirst : styles.blockOther, e.is_me && !first && styles.blockMe]}>
              <Text style={[styles.blockRank, first && styles.onPrimary]}>{e.rank}</Text>
              <Text style={[type.caption, first && styles.onPrimary]}>{e.points.toLocaleString()} pts</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md },
  switching: { marginTop: spacing.xxl },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm },

  podium: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, marginTop: spacing.md },
  place: { flex: 1, alignItems: "center", gap: spacing.xs },
  podiumAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  podiumAvatarFirst: { width: 64, height: 64, borderRadius: 32 },
  podiumName: { fontFamily: fonts.bold, fontSize: 13, color: colors.text, marginBottom: spacing.xs },
  block: { alignSelf: "stretch", borderRadius: radius.md, alignItems: "center", justifyContent: "center", gap: 2 },
  blockFirst: { height: 110, backgroundColor: colors.primary },
  blockOther: { height: 80, backgroundColor: colors.card },
  blockMe: { borderWidth: 1.5, borderColor: colors.primary },
  blockRank: { fontFamily: fonts.extrabold, fontSize: 24, color: colors.text },
  onPrimary: { color: colors.onPrimary },

  pinned: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  notRanked: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg },
});
