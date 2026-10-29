// The five Sortify Wrapped story cards from docs/mockups/06-10: intro, total,
// top material, rarest find, rank. Back/Next buttons or a sideways swipe move
// between them; the progress bars at the top show where you are.

import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { PanResponder, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { binLabel } from "@/components/BinCard";
import type { RarestFind, WrappedOut } from "@/lib/api";
import { avatarEmoji } from "@/lib/avatars";
import { kgText, plural } from "@/lib/format";
import { materialLabel } from "@/lib/materials";
import {
  busiestDayText, comparedToAverage, introLine, monthName, rarityLine, shareMessage, withArticle,
} from "@/lib/wrapped";
import { colors, fonts, radius, spacing } from "@/theme";

const CARDS = 5;
const SWIPE_DISTANCE = 50;

// Each card's colours, from the mockups
type Theme = {
  bg: string;
  text: string;
  track: string; // empty progress bar
  fill: string; // filled progress bar
  backBg: string;
  backText: string;
  nextBg: string;
  nextText: string;
};

const white = colors.onPrimary;
const ink = colors.text;
const onColour = { text: white, track: "rgba(255,255,255,0.3)", fill: white, backBg: "rgba(255,255,255,0.2)", backText: white, nextBg: white, nextText: ink };

const THEMES: Theme[] = [
  { bg: "#1B3A26", ...onColour, nextBg: "#9FD3A8" }, // intro: dark green
  { bg: colors.primary, ...onColour }, // total: green
  { bg: "#2563A6", ...onColour }, // top material: blue
  { bg: "#F2C4A8", text: ink, track: "rgba(23,48,31,0.2)", fill: ink, backBg: "rgba(23,48,31,0.08)", backText: ink, nextBg: ink, nextText: white }, // rarest: peach
  { bg: colors.primarySoft, text: ink, track: "rgba(23,48,31,0.2)", fill: ink, backBg: "transparent", backText: ink, nextBg: colors.primary, nextText: white }, // rank: mint
];

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
  const t = THEMES[page];
  const month = monthName(data.month);

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
    <Intro key="intro" data={data} month={month} t={t} />,
    <Total key="total" data={data} t={t} />,
    <TopMaterial key="material" data={data} t={t} />,
    <Rarest key="rarest" find={data.rarest_find} t={t} />,
    <Rank key="rank" data={data} t={t} />,
  ];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.bg }]} edges={["top"]} {...swipe.panHandlers}>
      <View style={styles.progress} accessibilityLabel={`Card ${page + 1} of ${CARDS}`}>
        {cards.map((_, i) => (
          <View key={i} style={[styles.segment, { backgroundColor: i <= page ? t.fill : t.track }]} />
        ))}
      </View>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: t.text }]}>SORTIFY WRAPPED · {month.toUpperCase()}</Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
          <Feather name="x" size={22} color={t.text} />
        </Pressable>
      </View>

      <View style={styles.body}>{cards[page]}</View>

      {page === 0 && <Button label="Let's go" onPress={next} bg={t.nextBg} color={t.nextText} />}
      {page > 0 && page < CARDS - 1 && (
        <View style={styles.buttons}>
          <Button label="Back" onPress={back} bg={t.backBg} color={t.backText} grow />
          <Button label="Next" onPress={next} bg={t.nextBg} color={t.nextText} grow />
        </View>
      )}
      {page === CARDS - 1 && (
        <View style={styles.lastButtons}>
          <Button label="Share your Wrapped" icon="share" onPress={share} bg={t.nextBg} color={t.nextText} />
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.done}>
            <Text style={[styles.doneText, { color: t.text }]}>Done</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

// ---------- the five cards ----------

function Intro({ data, month, t }: { data: WrappedOut; month: string; t: Theme }) {
  return (
    <>
      <Text style={[styles.hero, { color: t.text }]}>
        Your{"\n"}
        {month},{"\n"}
        <Text style={{ color: "#9FD3A8" }}>sorted.</Text>
      </Text>
      <Text style={[styles.lead, { color: t.text }]}>{introLine(data)}</Text>
      <View style={styles.plant}>
        <MaterialCommunityIcons name="sprout" size={110} color="#5FAE74" />
        <View style={styles.potRim} />
        <View style={styles.pot} />
      </View>
    </>
  );
}

function Total({ data, t }: { data: WrappedOut; t: Theme }) {
  return (
    <>
      <Text style={[styles.lead, { color: t.text }]}>This month you sorted</Text>
      <Text style={[styles.giant, { color: t.text }]}>{data.items.toLocaleString()}</Text>
      <Text style={[styles.lead, { color: t.text }]}>{data.items === 1 ? "item" : "items"}</Text>
      <View style={[styles.panel, { backgroundColor: "rgba(0,0,0,0.12)" }]}>
        <Text style={[styles.panelTitle, { color: t.text }]}>about {kgText(data.kg)}</Text>
        <Text style={[styles.small, { color: t.text }]}>
          kept out of landfill. {comparedToAverage(data)}
        </Text>
      </View>
    </>
  );
}

function TopMaterial({ data, t }: { data: WrappedOut; t: Theme }) {
  const [top] = data.top_materials;
  if (!top) return <Text style={[styles.lead, { color: t.text }]}>No materials yet this month.</Text>;
  return (
    <>
      <Text style={[styles.lead, { color: t.text }]}>Your top material was</Text>
      <Text style={[styles.big, { color: t.text }]}>{materialLabel(top.material)}</Text>
      <Text style={[styles.small, { color: t.text }]}>
        {plural(top.count, "item")}. Most sorted: {top.top_items.join(" and ")}
      </Text>
      <View style={styles.list}>
        {data.top_materials.map((m, i) => (
          <View key={m.material} style={styles.listRow}>
            <Text style={[styles.listNumber, { color: t.text }]}>{i + 1}</Text>
            <Text style={[styles.listLabel, { color: t.text }]}>{materialLabel(m.material)}</Text>
            <Text style={[styles.listCount, { color: t.text }]}>{plural(m.count, "item")}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function Rarest({ find, t }: { find: RarestFind | null; t: Theme }) {
  if (!find) return <Text style={[styles.lead, { color: t.text }]}>No rare finds this month.</Text>;
  const where =
    find.bin === "dropoff"
      ? "It never goes in a bin, and you took it to a drop-off. Nice."
      : `It goes in the ${binLabel(find.bin).toLowerCase()}. Nice sorting.`;
  return (
    <>
      <Text style={[styles.lead, { color: t.text }]}>Your rarest find</Text>
      <View style={styles.rareCircle}>
        <MaterialCommunityIcons name={RARE_ICONS[find.category_id] ?? "star-four-points"} size={72} color={colors.primary} />
      </View>
      <Text style={[styles.big, { color: t.text }]}>{withArticle(find.item)}</Text>
      <Text style={[styles.small, { color: t.text }]}>
        {rarityLine(find.percent_of_players)} {where}
      </Text>
    </>
  );
}

function Rank({ data, t }: { data: WrappedOut; t: Theme }) {
  const top = data.top_recycler;
  return (
    <>
      <Text style={[styles.lead, { color: t.text }]}>You finished the month</Text>
      {data.rank ? (
        <Text style={[styles.rank, { color: t.text }]}>
          #{data.rank} <Text style={styles.rankCity}>in Ottawa</Text>
        </Text>
      ) : (
        <Text style={[styles.big, { color: t.text }]}>Keep sorting to get ranked</Text>
      )}
      {top && (
        <View style={styles.whiteCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>{avatarEmoji(top.avatar)}</Text>
          </View>
          <View>
            <Text style={styles.tileLabel}>TOP RECYCLER</Text>
            <Text style={styles.tileValue}>
              {top.is_me ? "You!" : top.name} · {top.points.toLocaleString()} pts
            </Text>
          </View>
        </View>
      )}
      <View style={styles.tiles}>
        <Tile label="Busiest day" value={busiestDayText(data.busiest_day)} />
        <Tile label="Longest streak" value={plural(data.longest_streak, "day")} />
      </View>
    </>
  );
}

// ---------- pieces ----------

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.whiteCard, styles.tile]}>
      <Text style={styles.small}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  bg: string;
  color: string;
  icon?: keyof typeof Feather.glyphMap;
  grow?: boolean; // share a row equally with the other button
};

function Button({ label, onPress, bg, color, icon, grow }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, grow && { flex: 1 }, { backgroundColor: bg }, pressed && { opacity: 0.85 }]}
    >
      {icon && <Feather name={icon} size={18} color={color} />}
      <Text style={[styles.buttonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  progress: { flexDirection: "row", gap: 4, marginTop: spacing.md },
  segment: { flex: 1, height: 3, borderRadius: 2 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.xl },
  eyebrow: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.5 },
  body: { flex: 1, justifyContent: "center", gap: spacing.md },

  hero: { fontFamily: fonts.extrabold, fontSize: 46, lineHeight: 50 },
  giant: { fontFamily: fonts.extrabold, fontSize: 110, lineHeight: 120 },
  big: { fontFamily: fonts.extrabold, fontSize: 40, lineHeight: 46 },
  lead: { fontFamily: fonts.semibold, fontSize: 18 },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: colors.textMuted },

  panel: { borderRadius: radius.md, padding: spacing.lg, gap: spacing.xs, marginTop: spacing.lg },
  panelTitle: { fontFamily: fonts.extrabold, fontSize: 26 },

  list: { gap: spacing.sm, marginTop: spacing.md },
  listRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: spacing.lg },
  listNumber: { fontFamily: fonts.extrabold, fontSize: 15, width: 28 },
  listLabel: { fontFamily: fonts.bold, fontSize: 15, flex: 1 },
  listCount: { fontFamily: fonts.semibold, fontSize: 13 },

  rareCircle: { width: 150, height: 150, borderRadius: 75, backgroundColor: "#FBE3D6", alignSelf: "center", alignItems: "center", justifyContent: "center", marginVertical: spacing.lg },

  rank: { fontFamily: fonts.extrabold, fontSize: 72, lineHeight: 80 },
  rankCity: { fontSize: 28 },
  whiteCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: "#D8A93B", alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 22 },
  tiles: { flexDirection: "row", gap: spacing.sm },
  tile: { flex: 1, flexDirection: "column", alignItems: "flex-start", gap: 2 },
  tileLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5, color: colors.textMuted },
  tileValue: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.text },

  plant: { alignItems: "center", marginTop: spacing.xl },
  potRim: { width: 84, height: 12, borderRadius: 4, backgroundColor: "#D9805A", marginTop: -8 },
  pot: { width: 70, height: 42, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: colors.terracotta },

  buttons: { flexDirection: "row", gap: spacing.sm },
  lastButtons: { gap: spacing.xs },
  button: { flexDirection: "row", gap: spacing.sm, alignItems: "center", justifyContent: "center", borderRadius: radius.md, paddingVertical: 16 },
  buttonText: { fontFamily: fonts.bold, fontSize: 15 },
  done: { alignItems: "center", paddingVertical: spacing.md },
  doneText: { fontFamily: fonts.bold, fontSize: 14 },
});
