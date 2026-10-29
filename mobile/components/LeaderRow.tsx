// One Board row below the podium: rank, avatar, name, items sorted, points.
// Your own row is green and says "You".

import { StyleSheet, Text, View } from "react-native";

import type { LeaderboardEntry } from "@/lib/api";
import { avatarEmoji } from "@/lib/avatars";
import { plural } from "@/lib/format";
import { colors, fonts, radius, spacing, type } from "@/theme";

export default function LeaderRow({ entry, subtitle }: { entry: LeaderboardEntry; subtitle?: string }) {
  const sub = subtitle ?? (entry.items != null ? `${plural(entry.items, "item")} sorted` : null);
  return (
    <View style={[styles.row, entry.is_me && styles.me]} testID={entry.is_me ? "my-row" : undefined}>
      <Text style={styles.rank}>{entry.rank}</Text>
      <View style={styles.avatar}>
        <Text style={styles.avatarEmoji}>{avatarEmoji(entry.avatar)}</Text>
      </View>
      <View style={styles.name}>
        <Text style={styles.nameText} numberOfLines={1}>
          {entry.is_me ? "You" : entry.name}
        </Text>
        {sub ? <Text style={type.caption}>{sub}</Text> : null}
      </View>
      <Text style={styles.points}>{entry.points.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md },
  me: { backgroundColor: colors.primarySoft, borderWidth: 1.5, borderColor: colors.primary },
  rank: { width: 24, fontFamily: fonts.bold, fontSize: 15, color: colors.textMuted },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 18 },
  name: { flex: 1 },
  nameText: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  points: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.text },
});
