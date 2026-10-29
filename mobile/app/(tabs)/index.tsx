// Home, from docs/mockups/01-home.png: greeting, "Up next" pickup banner, the
// plant that grows with your level, points and level bar, three stat tiles,
// and this week's Discover item. All from GET /me and GET /schedule/next.

import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DiscoverCard from "@/components/DiscoverCard";
import PickupBanner from "@/components/PickupBanner";
import PlantHero from "@/components/PlantHero";
import PointsToast from "@/components/PointsToast";
import { ErrorState, Loading } from "@/components/ScreenState";
import StatTile from "@/components/StatTile";
import { api, type DiscoverOut, type NextPickup, type ProfileOut } from "@/lib/api";
import { avatarEmoji } from "@/lib/avatars";
import { greeting, levelHint, plural } from "@/lib/format";
import { clearPointsToast, usePointsToast } from "@/lib/pointsToast";
import { useLoad } from "@/lib/useLoad";
import { colors, fonts, radius, spacing, type } from "@/theme";

type HomeData = { profile: ProfileOut; pickup: NextPickup | null };

const loadHome = async (): Promise<HomeData> => {
  const [profile, pickup] = await Promise.all([api.me(), api.nextPickup()]);
  return { profile, pickup };
};

export default function Home() {
  const { status, refreshing, refresh, retry, update } = useLoad(loadHome);
  const [discover, setDiscover] = useState<DiscoverOut | null>(null);
  const toast = usePointsToast();

  // Discover is extra: if it fails, Home still works without the card
  const loadDiscover = useCallback(() => api.discoverCurrent().then(setDiscover, () => setDiscover(null)), []);
  useFocusEffect(
    useCallback(() => {
      loadDiscover();
    }, [loadDiscover]),
  );

  const onRefresh = useCallback(() => {
    loadDiscover();
    return refresh();
  }, [loadDiscover, refresh]);

  if (status.state === "loading") return <Loading />;
  if (status.state === "error") return <ErrorState title="Couldn't load your garden" message={status.message} onRetry={retry} />;

  const { profile: p, pickup } = status.data;
  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <ScrollView
          testID="home-scroll"
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={type.caption}>
                {greeting(new Date().getHours())}, {p.name}
              </Text>
              <Text style={type.title}>Your garden is growing</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>{avatarEmoji(p.avatar)}</Text>
            </View>
          </View>

          <PickupBanner
            pickup={pickup}
            pickupDay={p.schedule?.pickup_day}
            onSaved={(next) => update((d) => ({ ...d, pickup: next }))}
          />

          <View style={styles.card}>
            <PlantHero level={p.level.number} name={p.level.name} />
            <Text style={styles.points}>{p.total_points.toLocaleString()}</Text>
            <Text style={[type.caption, styles.center]}>
              points · Level {p.level.number} {p.level.name}
            </Text>
            <View
              style={styles.track}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(p.level.progress * 100) }}
            >
              <View testID="level-bar" style={[styles.bar, { width: `${Math.round(p.level.progress * 100)}%` }]} />
            </View>
            <Text style={[type.caption, styles.center]}>{levelHint(p.level)}</Text>
          </View>

          <View style={styles.tiles}>
            <StatTile small value={p.items_this_week.toLocaleString()} label="items this week" />
            <StatTile small value={plural(p.current_streak, "day")} label="streak" />
            <StatTile small value={p.rank ? `#${p.rank}` : "–"} label={p.rank ? "in Ottawa" : "not ranked yet"} />
          </View>

          {discover ? <DiscoverCard discover={discover} /> : null}
        </ScrollView>
      </SafeAreaView>
      <PointsToast toast={toast} onHide={clearPointsToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md },

  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xs },
  headerText: { flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primaryBorder, alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 22 },

  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm },
  points: { fontFamily: fonts.extrabold, fontSize: 40, color: colors.text, textAlign: "center", marginTop: spacing.md },
  center: { textAlign: "center" },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.track, overflow: "hidden", marginTop: spacing.sm },
  bar: { height: 10, borderRadius: 5, backgroundColor: colors.primary },

  tiles: { flexDirection: "row", gap: spacing.sm },
});
