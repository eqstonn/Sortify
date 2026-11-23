// Board rows. LeaderRow: one chunky row below the podium (rank, avatar, name,
// items sorted, points). YouRow: your own row in deep green, pinned above the
// nav, with your rank in a terracotta badge and how far you've moved.

import { ArrowDown, ArrowUp } from "lucide-react-native";
import { Text, View } from "react-native";

import Avatar, { avatarUri } from "@/components/Avatar";
import Card from "@/components/Card";
import type { LeaderboardEntry } from "@/lib/api";
import { plural } from "@/lib/format";
import { makeStyles, useTheme } from "@/lib/theme";
import { chunky, fonts } from "@/theme";

export default function LeaderRow({ entry }: { entry: LeaderboardEntry }) {
  const { type } = useTheme();
  const s = useStyles();
  const sub = entry.items != null ? `${plural(entry.items, "item")} sorted` : null;
  return (
    <Card padding={0} depth={chunky.bandSmall} style={s.row} testID={entry.is_me ? "my-row" : undefined}>
      <Text style={s.rank}>{entry.rank}</Text>
      <Avatar uri={avatarUri(entry.avatar)} size={40} ring />
      <View style={s.name}>
        <Text style={type.cardTitle} numberOfLines={1}>
          {entry.is_me ? "You" : entry.name}
        </Text>
        {sub ? <Text style={s.sub}>{sub}</Text> : null}
      </View>
      <Text style={s.points}>{entry.points.toLocaleString()}</Text>
    </Card>
  );
}

type YouProps = { entry: LeaderboardEntry | null; movement: string | null };

export function YouRow({ entry, movement }: YouProps) {
  const { colors } = useTheme();
  const s = useStyles();
  const up = movement?.startsWith("Up");
  const down = movement?.startsWith("Down");
  const second = entry
    ? (movement ?? (entry.items != null ? `${plural(entry.items, "item")} sorted` : "Keep sorting to climb"))
    : "Sort an item to get ranked!";
  return (
    <Card tone="forest" padding={0} style={s.you} testID="you-row">
      <View style={s.badge}>
        <Text style={s.badgeText}>{entry ? entry.rank : "–"}</Text>
      </View>
      <Avatar uri={avatarUri(entry?.avatar)} size={40} ring ringColor={colors.onForest} />
      <View style={s.name}>
        <Text style={s.youName}>You</Text>
        <View style={s.moveRow}>
          {/* In a View: on web a bare icon would be painted under the green gradient */}
          {up || down ? (
            <View>
              {up ? <ArrowUp size={14} color={colors.onForest} strokeWidth={2.5} /> : <ArrowDown size={14} color={colors.onForest} strokeWidth={2.5} />}
            </View>
          ) : null}
          <Text style={s.move} numberOfLines={1}>
            {second}
          </Text>
        </View>
      </View>
      <Text style={s.youPoints}>{entry ? entry.points.toLocaleString() : ""}</Text>
    </Card>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  row: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 58, paddingLeft: 18, paddingRight: 16, paddingVertical: 8 },
  rank: { width: 18, fontFamily: fonts.heading, fontSize: 16, color: colors.textMuted, textAlign: "center" },
  name: { flex: 1 },
  sub: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 17, color: colors.textMuted },
  points: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },

  you: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 62, paddingHorizontal: 14, paddingVertical: 10 },
  badge: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center" },
  badgeText: { fontFamily: fonts.heading, fontSize: 14, color: colors.onTerracotta },
  youName: { fontFamily: fonts.heading, fontSize: 17, color: colors.onForest },
  moveRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  move: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.onForest },
  youPoints: { fontFamily: fonts.heading, fontSize: 20, color: colors.onForest },
}));
