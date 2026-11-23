// The five Sortify Wrapped story cards: intro, total, top material, rarest
// find, rank. Each is a big glass panel over the backdrop with its own tint.
// Back/Next buttons or a sideways swipe move between them; the bars at the
// top show where you are.

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ShareIcon } from "lucide-react-native";
import { type ReactNode, useMemo, useState } from "react";
import { Image, PanResponder, Share, StyleSheet, Text, View } from "react-native";

import ActionButton from "@/components/ActionButton";
import Avatar, { avatarUri } from "@/components/Avatar";
import { binLabel } from "@/components/BinCard";
import GlassCard from "@/components/GlassCard";
import GlassIconButton from "@/components/GlassIconButton";
import Screen, { useNavSpace } from "@/components/Screen";
import type { RarestFind, WrappedOut } from "@/lib/api";
import { kgText, plural } from "@/lib/format";
import { materialLabel } from "@/lib/materials";
import { plantArt, STAGES } from "@/lib/plant";
import { makeStyles, useTheme } from "@/lib/theme";
import {
  busiestDayText, comparedToAverage, introLine, monthName, rarityLine, shareMessage, withArticle,
} from "@/lib/wrapped";
import { fonts, layout, podiumColors, radius, spacing } from "@/theme";

const CARDS = 5;
const SWIPE_DISTANCE = 50;

// Icon in the circle on the rarest-find card
const RARE_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  battery: "battery-60",
  electronics: "cellphone",
  light_bulb: "lightbulb-outline",
  paint_chemical: "spray-bottle",
  propane_tank: "gas-cylinder",
  aerosol_can: "spray",
};

export default function WrappedStory({ data, onClose }: { data: WrappedOut; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const month = monthName(data.month);
  const navSpace = useNavSpace();
  const { colors } = useTheme();
  const s = useStyles();

  // setPage with a function, so the swipe handler made once still sees the current page
  const next = () => setPage((p) => Math.min(p + 1, CARDS - 1));
  const back = () => setPage((p) => Math.max(p - 1, 0));
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderRelease: (_, g) => {
          if (g.dx < -SWIPE_DISTANCE) setPage((p) => Math.min(p + 1, CARDS - 1));
          if (g.dx > SWIPE_DISTANCE) setPage((p) => Math.max(p - 1, 0));
        },
      }),
    [],
  );

  const share = () => Share.share({ message: shareMessage(data) }).catch(() => {});

  const cards = [
    <Intro key="intro" data={data} month={month} />,
    <Total key="total" data={data} />,
    <TopMaterial key="material" data={data} />,
    <Rarest key="rarest" find={data.rarest_find} />,
    <Rank key="rank" data={data} />,
  ];

  return (
    <Screen>
      <View style={[s.screen, { paddingBottom: navSpace }]} {...swipe.panHandlers}>
        <View style={s.progress} accessibilityLabel={`Card ${page + 1} of ${CARDS}`}>
          {cards.map((_, i) => (
            <View key={i} style={[s.segment, i <= page && s.segmentDone]} />
          ))}
        </View>
        <View style={s.header}>
          <Text style={s.eyebrow}>SORTIFY WRAPPED · {month.toUpperCase()}</Text>
          <GlassIconButton icon="x" label="Close" onPress={onClose} size={40} />
        </View>

        <GlassCard style={s.panel}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.wrapped[page] }]} />
          <View style={s.body}>{cards[page]}</View>
        </GlassCard>

        {page === 0 && <ActionButton label="Let's go" onPress={next} />}
        {page > 0 && page < CARDS - 1 && (
          <View style={s.buttons}>
            <ActionButton variant="glass" label="Back" onPress={back} style={s.grow} />
            <ActionButton label="Next" onPress={next} style={s.grow} />
          </View>
        )}
        {page === CARDS - 1 && (
          <View style={s.buttons}>
            <ActionButton variant="glass" label="Done" onPress={onClose} style={s.grow} />
            <ActionButton label="Share your Wrapped" icon={ShareIcon} onPress={share} style={s.share} />
          </View>
        )}
      </View>
    </Screen>
  );
}

// ---------- the five cards ----------

function Intro({ data, month }: { data: WrappedOut; month: string }) {
  const s = useStyles();
  return (
    <>
      <Text style={s.hero}>
        Your{"\n"}
        {month},{"\n"}
        <Text style={s.heroAccent}>sorted.</Text>
      </Text>
      <Text style={s.lead}>{introLine(data)}</Text>
      <View style={s.plant}>
        <Image source={plantArt(STAGES).poster} style={s.plantImage} accessibilityIgnoresInvertColors />
      </View>
    </>
  );
}

function Total({ data }: { data: WrappedOut }) {
  const s = useStyles();
  return (
    <>
      <Text style={s.lead}>This month you sorted</Text>
      <Text style={s.giant}>{data.items.toLocaleString()}</Text>
      <Text style={s.lead}>{data.items === 1 ? "item" : "items"}</Text>
      <Inner>
        <Text style={s.panelTitle}>about {kgText(data.kg)}</Text>
        <Text style={s.small}>kept out of landfill. {comparedToAverage(data)}</Text>
      </Inner>
    </>
  );
}

function TopMaterial({ data }: { data: WrappedOut }) {
  const s = useStyles();
  const [top] = data.top_materials;
  if (!top) return <Text style={s.lead}>No materials yet this month.</Text>;
  return (
    <>
      <Text style={s.lead}>Your top material was</Text>
      <Text style={s.big}>{materialLabel(top.material)}</Text>
      <Text style={s.small}>
        {plural(top.count, "item")}. Most sorted: {top.top_items.join(" and ")}
      </Text>
      <View style={s.list}>
        {data.top_materials.map((m, i) => (
          <Inner key={m.material} row>
            <Text style={s.listNumber}>{i + 1}</Text>
            <Text style={s.listLabel}>{materialLabel(m.material)}</Text>
            <Text style={s.listCount}>{plural(m.count, "item")}</Text>
          </Inner>
        ))}
      </View>
    </>
  );
}

function Rarest({ find }: { find: RarestFind | null }) {
  const { colors } = useTheme();
  const s = useStyles();
  if (!find) return <Text style={s.lead}>No rare finds this month.</Text>;
  const where =
    find.bin === "dropoff"
      ? "It never goes in a bin, and you took it to a drop-off. Nice."
      : `It goes in the ${binLabel(find.bin).toLowerCase()}. Nice sorting.`;
  return (
    <>
      <Text style={s.lead}>Your rarest find</Text>
      <View style={s.rareCircle}>
        <MaterialCommunityIcons name={RARE_ICONS[find.category_id] ?? "star-four-points"} size={68} color={colors.accent} />
      </View>
      <Text style={s.big}>{withArticle(find.item)}</Text>
      <Text style={s.small}>
        {rarityLine(find.percent_of_players)} {where}
      </Text>
    </>
  );
}

function Rank({ data }: { data: WrappedOut }) {
  const s = useStyles();
  const top = data.top_recycler;
  return (
    <>
      <Text style={s.lead}>You finished the month</Text>
      {data.rank ? (
        <Text style={s.rank}>
          #{data.rank} <Text style={s.rankCity}>in Ottawa</Text>
        </Text>
      ) : (
        <Text style={s.big}>Keep sorting to get ranked</Text>
      )}
      {top && (
        <Inner row>
          <Avatar uri={avatarUri(top.avatar)} size={44} ring ringWidth={2} ringColor={podiumColors[0]} />
          <View>
            <Text style={s.tileLabel}>TOP RECYCLER</Text>
            <Text style={s.tileValue}>
              {top.is_me ? "You!" : top.name} · {top.points.toLocaleString()} pts
            </Text>
          </View>
        </Inner>
      )}
      <View style={s.tiles}>
        <Inner style={s.tile}>
          <Text style={s.tileLabel}>BUSIEST DAY</Text>
          <Text style={s.tileValue}>{busiestDayText(data.busiest_day)}</Text>
        </Inner>
        <Inner style={s.tile}>
          <Text style={s.tileLabel}>LONGEST STREAK</Text>
          <Text style={s.tileValue}>{plural(data.longest_streak, "day")}</Text>
        </Inner>
      </View>
    </>
  );
}

// A lighter box inside the card, for stats and list rows
function Inner({ children, row, style }: { children: ReactNode; row?: boolean; style?: object }) {
  const s = useStyles();
  return <View style={[s.inner, row && s.innerRow, style]}>{children}</View>;
}

const useStyles = makeStyles(({ colors }) => ({
  screen: { flex: 1, paddingHorizontal: layout.gutter, gap: spacing.md },
  progress: { flexDirection: "row", gap: 4, marginTop: spacing.md },
  segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.track },
  segmentDone: { backgroundColor: colors.text },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.8, color: colors.text },

  panel: { flex: 1, padding: spacing.xl },
  body: { flex: 1, justifyContent: "center", gap: spacing.md },

  hero: { fontFamily: fonts.extrabold, fontSize: 44, lineHeight: 48, color: colors.text },
  heroAccent: { color: colors.accent },
  giant: { fontFamily: fonts.light, fontSize: 110, lineHeight: 120, letterSpacing: -3, color: colors.text },
  big: { fontFamily: fonts.extrabold, fontSize: 36, lineHeight: 42, color: colors.text },
  lead: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: colors.textMuted },

  // 12 px boxes inside the card's 24 px padding: separate surfaces, own radius
  inner: {
    backgroundColor: colors.glassInner,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.inner,
    padding: spacing.md,
    gap: spacing.xs,
  },
  innerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  panelTitle: { fontFamily: fonts.light, fontSize: 30, lineHeight: 36, color: colors.text },

  list: { gap: spacing.sm, marginTop: spacing.sm },
  listNumber: { fontFamily: fonts.extrabold, fontSize: 15, width: 22, color: colors.accent },
  listLabel: { fontFamily: fonts.bold, fontSize: 15, flex: 1, color: colors.text },
  listCount: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },

  rareCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.glassInner,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.md,
  },

  rank: { fontFamily: fonts.light, fontSize: 72, lineHeight: 80, color: colors.text },
  rankCity: { fontFamily: fonts.bold, fontSize: 26 },
  tiles: { flexDirection: "row", gap: spacing.sm },
  tile: { flex: 1 },
  tileLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.8, color: colors.textMuted },
  tileValue: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.text },

  plant: { alignSelf: "center", marginTop: spacing.md, borderRadius: radius.card, overflow: "hidden", borderWidth: 1, borderColor: colors.glassBorder },
  plantImage: { width: 170, height: 170 },

  buttons: { flexDirection: "row", gap: spacing.sm },
  grow: { flex: 1 },
  share: { flex: 2 },
}));
