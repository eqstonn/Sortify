// Home: greeting and avatar, the "Up next" pickup card, the big plant for your
// level, and a sheet that scrolls up over the plant with your points, level,
// three stat tiles and Discover weekly. From GET /me, GET /schedule/next and
// GET /discover/current. Layout: assets/redesign "Home" and "Sheet pulled up".

import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { Flame, Leaf, Trophy } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";

import Avatar, { avatarUri } from "@/components/Avatar";
import DiscoverRows from "@/components/DiscoverRows";
import HeroSheet from "@/components/HeroSheet";
import PickupBanner from "@/components/PickupBanner";
import Pill from "@/components/Pill";
import PointsToast from "@/components/PointsToast";
import ProgressBar from "@/components/ProgressBar";
import Screen, { useNavSpace } from "@/components/Screen";
import { ErrorState, Loading } from "@/components/ScreenState";
import StatTile from "@/components/StatTile";
import { api, type DiscoverOut, type NextPickup, type ProfileOut } from "@/lib/api";
import { demoDiscover, demoPickup, demoProfile, isOffline } from "@/lib/demo";
import { greeting, levelHint, plural } from "@/lib/format";
import { plantArt, stageFor } from "@/lib/plant";
import { clearPointsToast, usePointsToast } from "@/lib/pointsToast";
import { makeStyles, useTheme } from "@/lib/theme";
import { useLoad } from "@/lib/useLoad";
import { chunky, fonts, layout, spacing } from "@/theme";

// demo: the backend couldn't be reached, so these are the mockup's numbers
type HomeData = { profile: ProfileOut; pickup: NextPickup | null; demo: boolean };

const loadHome = async (): Promise<HomeData> => {
  try {
    const [profile, pickup] = await Promise.all([api.me(), api.nextPickup()]);
    return { profile, pickup, demo: false };
  } catch (e) {
    if (isOffline(e)) return { profile: demoProfile, pickup: demoPickup, demo: true };
    throw e;
  }
};

// The plant art is square with empty space above the leaves; this much of it shows above the sheet
const PLANT_SHOWN = 0.86;
const PLANT_MAX = 370;

export default function Home() {
  const { status, refreshing, refresh, retry, update } = useLoad(loadHome);
  const [discover, setDiscover] = useState<DiscoverOut | null>(null);
  const [areaHeight, setAreaHeight] = useState(0);
  const { width } = useWindowDimensions();
  const toast = usePointsToast();
  const navSpace = useNavSpace();
  const { type } = useTheme();
  const s = useStyles();

  // Discover is extra: if it fails, Home still works without its first row
  const loadDiscover = useCallback(
    () => api.discoverCurrent().then(setDiscover, (e) => setDiscover(isOffline(e) ? demoDiscover : null)),
    [],
  );
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

  const { profile: p, pickup, demo } = status.data;

  // As big as the mockup on a normal phone; smaller on a short one so the sheet still shows
  const column = Math.min(width, layout.maxContent);
  const fit = areaHeight > 0 ? (areaHeight - 190) / PLANT_SHOWN : PLANT_MAX;
  const plant = Math.round(Math.max(200, Math.min(column * 0.92, PLANT_MAX, fit)));
  const heroHeight = Math.round(plant * PLANT_SHOWN);

  return (
    <Screen>
      <View style={s.top}>
        <View style={s.header}>
          <View style={s.headerText}>
            <Text style={s.greeting} numberOfLines={1}>
              {greeting(new Date().getHours())}, {p.name}
            </Text>
            <Text style={type.title}>Your garden is growing</Text>
          </View>
          <Pressable onPress={() => router.navigate("/me")} accessibilityRole="button" accessibilityLabel="Your profile" hitSlop={6}>
            <Avatar uri={avatarUri(p.avatar)} size={46} ring ringWidth={2} depth={chunky.band} />
          </Pressable>
        </View>
        <View style={s.upNext}>
          <PickupBanner
            pickup={pickup}
            pickupDay={p.schedule?.pickup_day}
            onSaved={(next) => update((d) => ({ ...d, pickup: next }))}
          />
        </View>
      </View>

      <HeroSheet
        testID="home-scroll"
        heroHeight={heroHeight}
        bottomSpace={navSpace}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onAreaHeight={setAreaHeight}
        hero={
          // The pot's bottom tucks 12 pt under the sheet
          <View style={[s.plantWrap, { top: heroHeight + 12 - plant }]}>
            <Image
              source={plantArt(stageFor(p.level.number)).poster}
              style={{ width: plant, height: plant }}
              contentFit="contain"
              accessible
              accessibilityRole="image"
              accessibilityLabel={`Your plant: level ${p.level.number}, ${p.level.name}`}
              testID="plant"
            />
          </View>
        }
      >
        {demo ? (
          <View style={s.offline} testID="offline-note">
            <Text style={type.caption}>Offline: showing demo data.</Text>
            <Pressable onPress={retry} accessibilityRole="button" hitSlop={8}>
              <Text style={s.retry}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={s.pointsRow}>
          <View style={s.points}>
            <Text style={type.display} testID="points">
              {p.total_points.toLocaleString()}
            </Text>
            <Text style={s.pointsWord}>points</Text>
          </View>
          <Pill label={`Level ${p.level.number} · ${p.level.name}`} testID="level-pill" />
        </View>

        <ProgressBar value={p.level.progress} label="Progress to the next level" testID="level-bar" style={s.bar} />
        <Text style={[type.caption, s.hint]}>{levelHint(p.level)}</Text>

        <View style={s.tiles}>
          <StatTile small value={p.items_this_week.toLocaleString()} label="items this week" icon={Leaf} />
          <StatTile small value={plural(p.current_streak, "day")} label="streak" icon={Flame} />
          <StatTile small value={p.rank ? `#${p.rank}` : "–"} label={p.rank ? "in Ottawa" : "not ranked yet"} icon={Trophy} />
        </View>

        <DiscoverRows discover={discover} />
      </HeroSheet>

      <PointsToast toast={toast} onHide={clearPointsToast} />
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  // Above the plant, which can reach up behind the Up next card
  top: { zIndex: 1, paddingHorizontal: layout.gutter, paddingTop: 4 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  headerText: { flex: 1 },
  greeting: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 21, color: colors.text },
  upNext: { marginTop: 24, marginHorizontal: 10, marginBottom: 6 },

  plantWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },

  offline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  retry: { fontFamily: fonts.semibold, fontSize: 14, color: colors.terracotta, textDecorationLine: "underline" },

  pointsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  points: { flexDirection: "row", alignItems: "baseline", gap: 8, flexShrink: 1 },
  pointsWord: { fontFamily: fonts.medium, fontSize: 16, color: colors.textMuted },
  bar: { marginTop: 10 },
  hint: { marginTop: 12 },
  tiles: { flexDirection: "row", gap: 11, marginTop: 16, marginBottom: 28 },
}));
