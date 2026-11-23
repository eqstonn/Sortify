// Board ("Top charts"): This week / All time / Friends, the top three as a
// podium of pots, everyone else (to #20) as rows on a sheet that scrolls up
// over the podium, and your own row pinned in deep green above the nav, even
// when you're outside the top 20. From GET /leaderboard?range=week|all.
// Layout: assets/redesign "Leaderboard".

import { Users } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Card from "@/components/Card";
import Chips from "@/components/Chips";
import HeroSheet from "@/components/HeroSheet";
import IconTile from "@/components/IconTile";
import LeaderRow, { YouRow } from "@/components/LeaderRow";
import Podium, { PODIUM_HEIGHT } from "@/components/Podium";
import Screen, { NAV_HEIGHT, navBottom, useNavSpace } from "@/components/Screen";
import { ErrorState, Loading } from "@/components/ScreenState";
import { api, type LeaderboardOut, type LeaderboardRange } from "@/lib/api";
import { demoLeaderboard, isOffline } from "@/lib/demo";
import { boardSubtitle } from "@/lib/format";
import { movementText, rankMovement } from "@/lib/rankMovement";
import { makeStyles, useTheme } from "@/lib/theme";
import { useLoad } from "@/lib/useLoad";
import { fonts, layout, spacing } from "@/theme";

type Tab = LeaderboardRange | "friends";

const TABS: { value: Tab; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "all", label: "All time" },
  { value: "friends", label: "Friends" },
];

// demo: the backend couldn't be reached, so this is the mockup's board
type BoardData = { board: LeaderboardOut; movement: number | null; demo: boolean };

const YOU_ROW = 62; // the pinned row's height
const YOU_GAP = 13; // between it and the nav

export default function Board() {
  const [tab, setTab] = useState<Tab>("week");
  const [range, setRange] = useState<LeaderboardRange>("week"); // the last real board picked; Friends keeps it
  const load = useCallback(async (): Promise<BoardData> => {
    try {
      const board = await api.leaderboard(range);
      return { board, movement: board.me ? rankMovement(range, board.me.rank) : null, demo: false };
    } catch (e) {
      if (isOffline(e)) return { board: demoLeaderboard(range), movement: 3, demo: true };
      throw e;
    }
  }, [range]);
  const { status, refreshing, refresh, retry } = useLoad(load);
  const navSpace = useNavSpace();
  const insets = useSafeAreaInsets();
  const { colors, type } = useTheme();
  const s = useStyles();

  const pick = (t: Tab) => {
    setTab(t);
    if (t !== "friends") setRange(t);
  };

  if (status.state === "loading") return <Loading />;
  if (status.state === "error") return <ErrorState title="Couldn't load the board" message={status.message} onRetry={retry} />;

  const { board, movement, demo } = status.data;
  const friends = tab === "friends";
  const switching = !friends && board.range !== range; // the other range is still on its way
  const showPodium = !friends && !switching && board.entries.length > 0;
  const rest = board.entries.slice(3);
  const youBottom = navBottom(insets.bottom) + NAV_HEIGHT + YOU_GAP;

  return (
    <Screen>
      <View style={s.top}>
        <Text style={s.subtitle}>{friends ? "Ottawa · friends" : boardSubtitle(range)}</Text>
        <Text style={type.title}>Top charts</Text>
        <View style={s.tabs}>
          <Chips options={TABS} value={tab} onChange={pick} label="Leaderboard" />
        </View>
      </View>

      <HeroSheet
        testID="board-scroll"
        heroHeight={showPodium ? PODIUM_HEIGHT : 8}
        bottomSpace={friends ? navSpace : navSpace + YOU_ROW + YOU_GAP}
        refreshing={refreshing}
        onRefresh={friends ? undefined : refresh}
        hero={showPodium ? <Podium top={board.entries.slice(0, 3)} /> : null}
      >
        {demo ? (
          <View style={s.offline} testID="offline-note">
            <Text style={type.caption}>Offline: showing demo data.</Text>
            <Pressable onPress={retry} accessibilityRole="button" hitSlop={8}>
              <Text style={s.retry}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {friends ? (
          <Card style={s.empty} testID="friends-soon">
            <IconTile icon={Users} size={48} />
            <Text style={type.cardTitle}>Friends are coming soon</Text>
            <Text style={type.caption}>
              Soon you’ll be able to add friends and see how you stack up. For now, see where you rank in Ottawa.
            </Text>
          </Card>
        ) : switching ? (
          <ActivityIndicator color={colors.accent} style={s.switching} />
        ) : board.entries.length === 0 ? (
          <Card style={s.empty}>
            <Text style={type.cardTitle}>No one’s on the board yet</Text>
            <Text style={type.caption}>
              {range === "week" ? "Nobody has sorted anything this week." : "Nobody has sorted anything yet."} Scan an item to take #1!
            </Text>
          </Card>
        ) : (
          <View style={s.rows}>
            {rest.map((e) => (
              <LeaderRow key={e.user_id} entry={e} />
            ))}
          </View>
        )}
      </HeroSheet>

      {!friends && !switching ? (
        <View style={[s.pinned, { bottom: youBottom }]}>
          <YouRow
            entry={board.me}
            movement={board.me && !board.entries.some((e) => e.is_me) && movement === null ? "Keep sorting to reach the top 20" : movementText(range, movement)}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  top: { paddingHorizontal: layout.gutter, paddingTop: 4, paddingBottom: 6 },
  subtitle: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 21, color: colors.text },
  tabs: { marginTop: 16 },
  offline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  retry: { fontFamily: fonts.semibold, fontSize: 14, color: colors.terracotta, textDecorationLine: "underline" },
  rows: { gap: 10, marginHorizontal: -4 },
  empty: { gap: spacing.sm, alignItems: "flex-start" },
  switching: { marginTop: spacing.xxl },
  // Rows run 16 pt from the screen edges, a little wider than the 20 pt gutter
  pinned: { position: "absolute", left: 16, right: 16 },
}));
