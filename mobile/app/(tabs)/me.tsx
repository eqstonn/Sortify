// Me (Profile): your avatar with a leaf, name, "Recycling since…", level pill
// and a small plant on the right; an edit button top-right. A sheet scrolls up
// over the plant with four stat tiles, "What you sort" bars and your badges.
// Sign out at the bottom. From GET /me and GET /scans/me. Layout: assets/redesign "Profile".

import { Image } from "expo-image";
import {
  Flame, Globe, Leaf, Lock, LogOut, type LucideIcon, Pencil, Smartphone, Sparkle, Sprout, Star, Wine,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import ActionButton from "@/components/ActionButton";
import Avatar, { avatarUri } from "@/components/Avatar";
import Card from "@/components/Card";
import EditProfileSheet from "@/components/EditProfileSheet";
import HeroSheet from "@/components/HeroSheet";
import Pill from "@/components/Pill";
import ProgressBar from "@/components/ProgressBar";
import Screen, { useNavSpace } from "@/components/Screen";
import { ErrorState, Loading } from "@/components/ScreenState";
import StatTile from "@/components/StatTile";
import { api, type BadgeOut, type MaterialShare, type ProfileOut } from "@/lib/api";
import { demoProfile, demoSince, isOffline } from "@/lib/demo";
import { kgText, plural, recyclingSince } from "@/lib/format";
import { materialLabel } from "@/lib/materials";
import { plantArt, stageFor } from "@/lib/plant";
import { useSession } from "@/lib/session";
import { makeStyles, useTheme } from "@/lib/theme";
import { useLoad } from "@/lib/useLoad";
import { chunky, fonts, layout, spacing } from "@/theme";

// since: "Oct 2026", null before your first sort, undefined if GET /scans/me failed (the line is left out)
// demo: the backend couldn't be reached, so this is the mockup's profile
type MeData = { profile: ProfileOut; since: string | null | undefined; demo: boolean };

const loadMe = async (): Promise<MeData> => {
  try {
    // Scans only give the "Recycling since" date, so the page still loads without them
    const [profile, scans] = await Promise.all([api.me(), api.myScans().catch(() => undefined)]);
    return { profile, since: scans && recyclingSince(scans), demo: false };
  } catch (e) {
    if (isOffline(e)) return { profile: demoProfile, since: demoSince, demo: true };
    throw e;
  }
};

// Badge ids from app/services/badges.py
const BADGE_ICONS: Record<string, LucideIcon> = {
  first_sort: Sprout,
  ewaste_hero: Smartphone,
  streak_7: Flame,
  glass_master: Wine,
};

const HERO_HEIGHT = 222; // the header's height above the sheet
const AVATAR = 84;
const PLANT = 214;

export default function Me() {
  const { status, refreshing, refresh, retry, update } = useLoad(loadMe);
  const [editing, setEditing] = useState(false);
  const { signOut } = useSession();
  const navSpace = useNavSpace();
  const { colors, type } = useTheme();
  const s = useStyles();

  if (status.state === "loading") return <Loading />;
  if (status.state === "error") return <ErrorState title="Couldn't load your profile" message={status.message} onRetry={retry} />;

  const { profile: p, since, demo } = status.data;
  const earned = p.badges.filter((b) => b.earned).length;

  return (
    <Screen>
      <HeroSheet
        testID="me-scroll"
        heroHeight={HERO_HEIGHT}
        bottomSpace={navSpace}
        refreshing={refreshing}
        onRefresh={refresh}
        hero={
          // The small plant on the right; its pot tucks 12 pt under the sheet (clipped at the edge on a wide window)
          <View style={s.clip}>
            <Image
              source={plantArt(stageFor(p.level.number)).poster}
              style={[s.plant, { top: HERO_HEIGHT + 12 - PLANT }]}
              contentFit="contain"
              accessible
              accessibilityRole="image"
              accessibilityLabel={`Your plant: level ${p.level.number}, ${p.level.name}`}
              testID="plant"
            />
          </View>
        }
        over={
          <View style={s.header}>
            <View style={s.avatarWrap}>
              <AvatarLeaves />
              <Avatar uri={avatarUri(p.avatar)} size={AVATAR} ring ringWidth={2} depth={chunky.band} />
            </View>
            <Text style={s.name} numberOfLines={1}>
              {p.name}
            </Text>
            {since !== undefined ? (
              <Text style={s.since} testID="since">
                {since ? `Recycling since ${since}` : "Just getting started"}
              </Text>
            ) : null}
            <Pill label={`Level ${p.level.number} · ${p.level.name}`} style={s.pill} testID="level-pill" />

            <Card
              radius={22}
              padding={0}
              style={s.edit}
              onPress={() => setEditing(true)}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
            >
              <Pencil size={18} color={colors.text} strokeWidth={2.2} />
            </Card>
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

        <View style={s.wide}>
          <View style={s.tiles}>
            <StatTile value={p.total_points.toLocaleString()} label="total points" icon={Sparkle} highlight />
            <StatTile value={p.items_sorted.toLocaleString()} label="items sorted" icon={Leaf} />
          </View>
          <View style={s.tiles}>
            <StatTile value={kgText(p.kg_diverted)} label="kept out of landfill" icon={Globe} />
            <StatTile value={plural(p.longest_streak, "day")} label="longest streak" icon={Flame} />
          </View>

          <Card style={s.section} padding={0}>
            <Text style={type.heading}>What you sort</Text>
            {p.breakdown.length ? (
              <Breakdown rows={p.breakdown} />
            ) : (
              <Text style={[type.caption, s.sectionNote]}>Scan your first item to see what you sort.</Text>
            )}
          </Card>

          <Card style={s.section} padding={0}>
            <View style={s.sectionHeader}>
              <Text style={type.heading}>Badges</Text>
              <Text style={s.count}>
                {earned} of {p.badges.length}
              </Text>
            </View>
            <View style={s.badges}>
              {p.badges.map((b) => (
                <Badge key={b.id} badge={b} />
              ))}
            </View>
          </Card>
        </View>

        <ActionButton variant="secondary" icon={LogOut} label="Sign out" onPress={signOut} style={s.signOut} />
      </HeroSheet>

      <EditProfileSheet
        visible={editing}
        profile={p}
        onClose={() => setEditing(false)}
        onSaved={(saved) => {
          setEditing(false);
          update((d) => ({ ...d, profile: saved }));
        }}
        onPhoto={(saved) => update((d) => ({ ...d, profile: saved }))}
      />
    </Screen>
  );
}

// Two leaves sprouting from behind the avatar's top-right edge
function AvatarLeaves() {
  const { colors } = useTheme();
  const s = useStyles();
  return (
    <Svg width={46} height={31} viewBox="0 0 38 26" style={s.leaves}>
      <Path d="M17 24C12 20 4 14 2 3C11 3 18 10 19 23Z" fill={colors.leaf} stroke={colors.line} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M19 24C21 16 26 8 36 6C36 16 29 23 19 24Z" fill={colors.accent} stroke={colors.line} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}

function Breakdown({ rows }: { rows: MaterialShare[] }) {
  const s = useStyles();
  const most = Math.max(...rows.map((r) => r.count)); // the top material fills its bar
  return (
    <View style={s.bars}>
      {rows.map((r) => (
        <View key={r.material} style={s.barRow}>
          <Text style={s.barLabel} numberOfLines={1}>
            {materialLabel(r.material)}
          </Text>
          <ProgressBar
            value={r.count / most}
            height={10}
            edge={false}
            label={`${materialLabel(r.material)}: ${r.count}`}
            style={s.track}
          />
          <Text style={s.barCount}>{r.count}</Text>
        </View>
      ))}
    </View>
  );
}

const BADGE = 56;

function Badge({ badge }: { badge: BadgeOut }) {
  const { colors } = useTheme();
  const s = useStyles();
  const Icon = badge.earned ? (BADGE_ICONS[badge.id] ?? Star) : Lock;
  return (
    <View
      style={s.badge}
      accessible
      accessibilityLabel={`${badge.name}, ${badge.earned ? "earned" : `locked. ${badge.description}`}`}
    >
      {badge.earned ? (
        <Card tone="terracotta" radius={BADGE / 2} padding={0} depth={chunky.bandSmall} style={s.badgeCircle}>
          {/* In a View: on web a bare icon would be painted under the gradient */}
          <View>
            <Icon size={24} color={colors.onTerracotta} strokeWidth={2} />
          </View>
        </Card>
      ) : (
        <View style={[s.badgeCircle, s.badgeLocked]}>
          <Icon size={20} color={colors.textMuted} strokeWidth={2} />
        </View>
      )}
      <Text style={[s.badgeName, !badge.earned && s.badgeNameLocked]} numberOfLines={2}>
        {badge.name}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors, type }) => ({
  header: { flex: 1, paddingHorizontal: layout.gutter, paddingTop: 23 },
  avatarWrap: { width: AVATAR, height: AVATAR },
  leaves: { position: "absolute", top: -12, left: 44 },
  name: { marginTop: 7, marginRight: 150, fontFamily: fonts.heading, fontSize: 32, lineHeight: 38, letterSpacing: -0.3, color: colors.text },
  since: { marginTop: 5, fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, color: colors.text },
  pill: { marginTop: 6 },
  edit: { position: "absolute", top: 4, right: layout.gutter, width: 44, height: 44, alignItems: "center", justifyContent: "center" },

  clip: { ...StyleSheet.absoluteFill, overflow: "hidden" },
  plant: { position: "absolute", right: -12, width: PLANT, height: PLANT },

  offline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  retry: { fontFamily: fonts.semibold, fontSize: 14, color: colors.terracotta, textDecorationLine: "underline" },

  // The tiles and cards run 16 pt from the screen edges, a little wider than the 20 pt gutter
  wide: { marginHorizontal: -4, gap: 11 },
  tiles: { flexDirection: "row", gap: 10 },

  section: { paddingHorizontal: 17, paddingTop: 14, paddingBottom: 17, marginTop: 5 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  sectionNote: { marginTop: spacing.sm },
  count: { fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted },

  bars: { marginTop: 12, gap: 10 },
  barRow: { flexDirection: "row", alignItems: "center", height: 22 },
  barLabel: { width: 80, fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  track: { flex: 1 },
  barCount: { width: 38, textAlign: "right", fontFamily: fonts.heading, fontSize: 17, color: colors.text },

  badges: { flexDirection: "row", marginTop: 16, marginHorizontal: -6, gap: 6 },
  badge: { flex: 1, alignItems: "center", gap: 8 },
  badgeCircle: { width: BADGE, height: BADGE, borderRadius: BADGE / 2, alignItems: "center", justifyContent: "center" },
  badgeLocked: { backgroundColor: colors.cardInset, borderWidth: chunky.stroke, borderStyle: "dashed", borderColor: colors.textMuted },
  badgeName: { ...type.caption, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.text, textAlign: "center" },
  badgeNameLocked: { color: colors.textMuted },

  signOut: { marginTop: 28 },
}));
