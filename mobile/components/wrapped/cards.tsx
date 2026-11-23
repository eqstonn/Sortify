// The seven Sortify Wrapped posters. Each is full-bleed colour with big shapes
// moving behind oversized type (allowed to run off the edges), and every
// element springs in one after another. Data comes straight from GET /wrapped;
// the sentences come from lib/wrapped.ts.
//
// Every card gets:
//   size   the card's width and height
//   inset  room to leave at the top (progress bars) and bottom (nav bar)

import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Blob, Disc, Dots, Leaf, RecycleArrows, Ring, Scribble, Stripes } from "@/components/wrapped/art";
import { CountUp, Loop, Move, Rise } from "@/components/wrapped/motion";
import type { WrappedOut } from "@/lib/api";
import { kgText, plural } from "@/lib/format";
import { materialLabel } from "@/lib/materials";
import { makeStyles, useTheme } from "@/lib/theme";
import {
  busiestDayText, comparedToAverage, introLine, kgComparison, monthName, rarityLine, topShare, withArticle,
} from "@/lib/wrapped";
import { fonts } from "@/theme";

export type CardProps = {
  data: WrappedOut;
  size: { w: number; h: number };
  inset: { top: number; bottom: number };
};

const GUTTER = 24;

/** The full-bleed background. `label` is what a screen reader says for the whole card. */
function Poster({ bg, label, children }: { bg: string; label: string; children: ReactNode }) {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: bg, overflow: "hidden" }]} accessible accessibilityLabel={label}>
      {children}
    </View>
  );
}

/** The text column, between the progress bars and the nav bar. */
function Column({ inset, children, end }: { inset: CardProps["inset"]; children: ReactNode; end?: boolean }) {
  return (
    <View
      style={[styles.column, { paddingTop: inset.top, paddingBottom: inset.bottom }, end && styles.columnEnd]}
      pointerEvents="none"
    >
      {children}
    </View>
  );
}

// ---------- 1. intro: sonar rings ----------

export function IntroCard({ data, size, inset }: CardProps) {
  const P = useTheme().colors.wrapped;
  const s = useStyles();
  const month = monthName(data.month);
  const ring = Math.max(size.w, size.h) * 1.15;
  const cy = size.h * 0.4;

  return (
    <Poster bg={P.forest} label={`Your ${month} in the bin. ${introLine(data)}`}>
      {/* Rings pulse out from the middle, one after another, like sonar */}
      <View style={{ position: "absolute", width: ring, height: ring, left: size.w / 2 - ring / 2, top: cy - ring / 2 }}>
        {[0, 1, 2, 3].map((i) => (
          <Loop
            key={i}
            style={StyleSheet.absoluteFill}
            from={{ scale: 0.06, opacity: 1 }}
            to={{ scale: 1, opacity: 0 }}
            duration={3200}
            delay={i * 800}
            back={false}
          >
            <Ring size={ring} color={i % 2 ? P.marigold : P.sage} stroke={14} />
          </Loop>
        ))}
        <Rise from="pop" delay={150} bouncy style={[styles.abs, { left: ring / 2 - 56, top: ring / 2 - 56 }]}>
          <Loop from={{ rotate: "0deg" }} to={{ rotate: "360deg" }} duration={8000} back={false}>
            <RecycleArrows size={112} top={P.terracotta} bottom={P.marigold} />
          </Loop>
        </Rise>
      </View>

      <Column inset={inset} end>
        <Rise from="above" delay={100}>
          <Text style={[s.eyebrow, { color: P.marigold }]}>
            SORTIFY WRAPPED · {month.toUpperCase()} {data.year}
          </Text>
        </Rise>
        <View style={styles.grow} />
        {["Your", "month", "in the", "bin."].map((word, i) => (
          <Rise key={word} from="left" delay={350 + i * 130}>
            <Text style={[s.huge, { color: i === 3 ? P.marigold : P.cream }]} allowFontScaling={false}>
              {word}
            </Text>
          </Rise>
        ))}
        <Rise from="below" delay={950}>
          <Text style={[s.body, s.gapAbove, { color: P.cream }]}>{introLine(data)}</Text>
        </Rise>
      </Column>
    </Poster>
  );
}

// ---------- 2. total items: count up, arrows orbiting ----------

export function TotalCard({ data, size, inset }: CardProps) {
  const P = useTheme().colors.wrapped;
  const s = useStyles();
  const orbit = Math.min(size.w - 16, 400);
  const radius = orbit / 2 - 36;

  return (
    <Poster bg={P.marigold} label={`You sorted ${plural(data.items, "item")} this month and earned ${plural(data.points, "point")}.`}>
      <Loop style={[styles.abs, { top: -size.w * 0.3, right: -size.w * 0.35 }]} from={{ rotate: "0deg", translateY: 0 }} to={{ rotate: "30deg", translateY: 40 }} duration={5200}>
        <Blob size={size.w * 0.95} color={P.cream} shape={1} />
      </Loop>
      <Loop style={[styles.abs, { bottom: -size.w * 0.25, left: -size.w * 0.3 }]} from={{ scale: 1 }} to={{ scale: 1.12 }} duration={3000}>
        <Blob size={size.w * 0.8} color={P.sage} shape={2} />
      </Loop>

      <Column inset={inset}>
        <Rise from="above" delay={100}>
          <Text style={[s.eyebrow, { color: P.forest }]}>THIS MONTH YOU SORTED</Text>
        </Rise>
        <View style={styles.grow} />
        <View style={{ width: orbit, height: orbit, alignSelf: "center" }}>
          {/* Three recycling arrows ride a slowly spinning circle round the number */}
          <Loop style={StyleSheet.absoluteFill} from={{ rotate: "0deg" }} to={{ rotate: "360deg" }} duration={7000} back={false}>
            {[0, 1, 2].map((k) => {
              const angle = (k * 2 * Math.PI) / 3 - Math.PI / 2;
              return (
                <Rise
                  key={k}
                  from="pop"
                  delay={500 + k * 160}
                  bouncy
                  style={[styles.abs, { left: orbit / 2 + radius * Math.cos(angle) - 30, top: orbit / 2 + radius * Math.sin(angle) - 30 }]}
                >
                  <RecycleArrows size={60} top={P.terracotta} bottom={P.forest} />
                </Rise>
              );
            })}
          </Loop>
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <CountUp
              target={data.items}
              format={(n) => Math.round(n).toLocaleString()}
              duration={1500}
              delay={300}
              style={[s.mega, { color: P.forest }]}
              label={plural(data.items, "item")}
              testID="total-count"
            />
          </View>
        </View>
        <View style={styles.grow} />
        <Rise from="below" delay={700}>
          <Text style={[s.big, { color: P.forest }]}>{data.items === 1 ? "item" : "items"} sorted</Text>
        </Rise>
        <Rise from="below" delay={850}>
          <Text style={[s.line, { color: P.terracotta }]}>and {plural(data.points, "point")} earned</Text>
        </Rise>
      </Column>
    </Poster>
  );
}

// ---------- 3. top material: giant stacked bands over diagonal stripes ----------

export function MaterialCard({ data, size, inset }: CardProps) {
  const P = useTheme().colors.wrapped;
  const s = useStyles();
  const [top, ...rest] = data.top_materials;
  const label = materialLabel(top.material);
  const stripe = 30;
  const field = (size.w + size.h) * 1.3; // big enough to cover the card once rotated

  return (
    <Poster bg={P.cream} label={`Your top material was ${label}: ${plural(top.count, "item")}, ${topShare(data)}% of everything you sorted.`}>
      <View style={[styles.abs, { width: field, height: field, left: size.w / 2 - field / 2, top: size.h / 2 - field / 2, transform: [{ rotate: "-28deg" }] }]}>
        {/* Moves exactly one stripe + gap, so the loop is seamless */}
        <Loop from={{ translateX: 0 }} to={{ translateX: stripe * 2 }} duration={1600} back={false}>
          <Stripes width={field + stripe * 4} height={field} color={P.sage} thickness={stripe} />
        </Loop>
      </View>

      <Column inset={inset}>
        <Rise from="above" delay={100}>
          <Text style={[s.eyebrow, { color: P.forest }]}>YOUR TOP MATERIAL</Text>
        </Rise>
        <View style={styles.grow} />
        {[0, 1, 2, 3].map((i) => {
          const fromRight = i % 2 === 1;
          return (
            <Rise key={i} from={fromRight ? "right" : "left"} delay={250 + i * 140} style={[styles.band, fromRight ? styles.bandRight : styles.bandLeft]}>
              <View style={[styles.bandInner, { backgroundColor: fromRight ? P.terracotta : P.forest, transform: [{ rotate: fromRight ? "2deg" : "-2deg" }] }]}>
                <Text style={[s.huge, { color: i === 3 ? P.marigold : P.cream }]} numberOfLines={1} ellipsizeMode="clip" allowFontScaling={false}>
                  {label.toUpperCase()}
                </Text>
              </View>
            </Rise>
          );
        })}
        <View style={styles.grow} />
        <Rise from="below" delay={900}>
          <Text style={[s.line, { color: P.forest }]}>
            {plural(top.count, "item")} · {topShare(data)}% of everything
          </Text>
        </Rise>
        {rest.length > 0 ? (
          <Rise from="below" delay={1050}>
            <Text style={[s.body, { color: P.forest }]}>Then {rest.slice(0, 3).map((m) => materialLabel(m.material)).join(", ")}</Text>
          </Rise>
        ) : null}
      </Column>
    </Poster>
  );
}

// ---------- 4. rarest find: a spotlight sweeps in, the item pops, confetti ----------

const CONFETTI = 16;

export function RarestCard({ data, size, inset }: CardProps) {
  const P = useTheme().colors.wrapped;
  const s = useStyles();
  const find = data.rarest_find!;
  const spot = Math.min(size.w * 0.84, 380);
  const colors = [P.marigold, P.terracotta, P.sage, P.cream];

  return (
    <Poster bg={P.deep} label={`Your rarest find: ${withArticle(find.item)}. ${rarityLine(find.percent_of_players)}`}>
      <Loop style={[styles.abs, { top: size.h * 0.08, right: -40 }]} from={{ rotate: "-6deg" }} to={{ rotate: "6deg" }} duration={3600}>
        <Scribble width={size.w * 0.8} height={size.w * 0.32} color={P.sage} />
      </Loop>

      <Column inset={inset}>
        <Rise from="above" delay={100}>
          <Text style={[s.eyebrow, { color: P.marigold }]}>YOUR RAREST FIND</Text>
        </Rise>
        <View style={styles.grow} />
        <View style={{ width: spot, height: spot, alignSelf: "center" }}>
          {/* The spotlight sweeps in from the left and settles */}
          <Rise from="left" distance={size.w} delay={200} style={StyleSheet.absoluteFill}>
            <Loop from={{ scale: 1 }} to={{ scale: 1.04 }} duration={1600} delay={1200}>
              <Disc size={spot} color={P.cream} />
            </Loop>
          </Rise>
          {/* Confetti bursts out from behind it */}
          {Array.from({ length: CONFETTI }, (_, i) => {
            const angle = (i / CONFETTI) * 2 * Math.PI;
            const reach = spot * 0.56 + (i % 3) * 16;
            const dot = 10 + (i % 4) * 4;
            return (
              <Move
                key={i}
                delay={850 + i * 25}
                damping={11}
                from={{ opacity: 0, scale: 0, translateX: 0, translateY: 0 }}
                to={{ opacity: 1, scale: 1, translateX: Math.cos(angle) * reach, translateY: Math.sin(angle) * reach }}
                style={[styles.abs, { left: spot / 2 - dot / 2, top: spot / 2 - dot / 2 }]}
              >
                <Disc size={dot} color={colors[i % colors.length]} />
              </Move>
            );
          })}
          <Rise from="pop" delay={750} bouncy style={[StyleSheet.absoluteFill, styles.center, styles.spotText]}>
            <Text style={[s.big, styles.centered, { color: P.forest }]}>{find.name}</Text>
            <Text style={[s.body, styles.centered, { color: P.forest }]}>{withArticle(find.item)}</Text>
          </Rise>
        </View>
        <View style={styles.grow} />
        <Rise from="below" delay={1100}>
          <View style={[styles.pill, { backgroundColor: P.marigold }]}>
            <Text style={[s.pill, { color: P.deep }]}>{find.rarity.toUpperCase()}</Text>
          </View>
        </Rise>
        <Rise from="below" delay={1250}>
          <Text style={[s.line, { color: P.cream }]}>{rarityLine(find.percent_of_players)}</Text>
        </Rise>
      </Column>
    </Poster>
  );
}

// ---------- 5. kg diverted: a blob grows to fill the screen ----------

export function KgCard({ data, size, inset }: CardProps) {
  const P = useTheme().colors.wrapped;
  const s = useStyles();
  // Under 1 kg, count grams instead
  const grams = data.kg < 1;
  const target = grams ? Math.round(data.kg * 1000) : data.kg;
  const format = (n: number) => (grams || target >= 10 ? Math.round(n).toLocaleString() : n.toFixed(1));
  const blob = Math.max(size.w, size.h) * 0.5;

  return (
    <Poster bg={P.cream} label={`About ${kgText(data.kg)} kept out of landfill. ${kgComparison(data.kg)}. ${comparedToAverage(data)}`}>
      {/* Starts small and swells until it covers the card */}
      <Move
        style={[styles.abs, { width: blob, height: blob, left: size.w / 2 - blob / 2, top: size.h * 0.42 - blob / 2 }]}
        from={{ scale: 0.25 }}
        to={{ scale: 3.2 }}
        duration={2300}
        delay={200}
      >
        <Loop from={{ rotate: "0deg" }} to={{ rotate: "360deg" }} duration={20000} back={false}>
          <Blob size={blob} color={P.terracotta} shape={0} />
        </Loop>
      </Move>
      {[
        { left: 18, top: size.h * 0.16, size: 46, color: P.sage, turn: "-14deg" },
        { left: size.w - 80, top: size.h * 0.3, size: 34, color: P.forest, turn: "16deg" },
        { left: size.w * 0.2, top: size.h * 0.66, size: 40, color: P.marigold, turn: "10deg" },
      ].map((l, i) => (
        <Loop key={i} style={[styles.abs, { left: l.left, top: l.top }]} from={{ rotate: "0deg", translateY: 0 }} to={{ rotate: l.turn, translateY: -14 }} duration={2200 + i * 400}>
          <Leaf size={l.size} color={l.color} vein={P.cream} />
        </Loop>
      ))}

      <Column inset={inset}>
        <Rise from="above" delay={100}>
          <Text style={[s.eyebrow, { color: P.deep }]}>KEPT OUT OF LANDFILL</Text>
        </Rise>
        <View style={styles.grow} />
        <View style={styles.numberRow}>
          <CountUp target={target} format={format} duration={1900} delay={200} style={[s.mega, { color: P.deep }]} label={kgText(data.kg)} testID="kg-count" />
          <Text style={[s.big, { color: P.deep }]}>{grams ? "g" : "kg"}</Text>
        </View>
        <Rise from="below" delay={1300}>
          <Text style={[s.statement, { color: P.deep }]}>{kgComparison(data.kg)}</Text>
        </Rise>
        <View style={styles.grow} />
        {comparedToAverage(data) ? (
          <Rise from="below" delay={1600}>
            <Text style={[s.body, { color: P.cream }]}>{comparedToAverage(data)}</Text>
          </Rise>
        ) : null}
      </Column>
    </Poster>
  );
}

// ---------- 6. rank: checker tiles in, a podium rises ----------

export function RankCard({ data, size, inset }: CardProps) {
  const P = useTheme().colors.wrapped;
  const s = useStyles();
  const tile = size.w / 5;
  const rows = Math.ceil(size.h / tile);
  const top = data.top_recycler;
  const podium = [
    { place: 2, height: size.h * 0.15, color: P.cream, delay: 350 },
    { place: 1, height: size.h * 0.22, color: P.marigold, delay: 200 },
    { place: 3, height: size.h * 0.11, color: P.sage, delay: 500 },
  ];
  const ranked = data.rank !== null;

  return (
    <Poster
      bg={P.terracotta}
      label={ranked ? `You're number ${data.rank} in Ottawa, out of ${data.players} players.` : "Not ranked yet this month."}
    >
      {/* Checker tiles pop in diagonally from the top left */}
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: 5 }, (_, c) =>
          (r + c) % 2 === 0 ? (
            <Rise key={`${r}-${c}`} from="pop" delay={(r + c) * 45} style={[styles.abs, { left: c * tile, top: r * tile, width: tile, height: tile, backgroundColor: P.clay }]} />
          ) : null,
        ),
      )}

      {/* The podium rises out of the nav bar line */}
      <View style={[styles.podium, { bottom: inset.bottom - 24, height: size.h * 0.24 }]}>
        {podium.map((p) => (
          <Move
            key={p.place}
            style={[styles.step, { height: p.height, backgroundColor: p.color }]}
            from={{ translateY: p.height + 30 }}
            to={{ translateY: 0 }}
            delay={p.delay + 300}
          >
            <Text style={[s.big, { color: P.forest }]}>{p.place}</Text>
            {data.rank === p.place ? <Text style={[s.pill, { color: P.forest }]}>YOU</Text> : null}
          </Move>
        ))}
      </View>

      <Column inset={{ top: inset.top, bottom: inset.bottom + size.h * 0.2 }}>
        <Rise from="above" delay={100}>
          <Text style={[s.eyebrow, { color: P.cream }]}>YOUR RANK IN OTTAWA</Text>
        </Rise>
        <Rise from="pop" delay={450} bouncy>
          <Text style={[s.mega, { color: P.cream }]} allowFontScaling={false}>
            {ranked ? `#${data.rank}` : "#–"}
          </Text>
        </Rise>
        <Rise from="left" delay={650}>
          <Text style={[s.big, { color: P.cream }]}>{ranked ? `of ${data.players.toLocaleString()} players` : "not ranked yet"}</Text>
        </Rise>
        {top ? (
          <Rise from="left" delay={800}>
            <Text style={[s.line, { color: P.marigold }]}>
              Top recycler: {top.is_me ? "You!" : top.name} · {top.points.toLocaleString()} pts
            </Text>
          </Rise>
        ) : null}
      </Column>
    </Poster>
  );
}

// ---------- 7. summary: a collage poster to share ----------

export function SummaryCard({ data, size, inset }: CardProps) {
  const P = useTheme().colors.wrapped;
  const s = useStyles();
  const month = monthName(data.month);
  const top = data.top_materials[0];
  const tiles = [
    { value: data.items.toLocaleString(), label: data.items === 1 ? "item sorted" : "items sorted", bg: P.marigold, ink: P.forest },
    { value: kgText(data.kg), label: "kept out of landfill", bg: P.sage, ink: P.forest },
    { value: top ? materialLabel(top.material) : "–", label: "top material", bg: P.terracotta, ink: P.cream },
    { value: data.rank ? `#${data.rank}` : "–", label: "in Ottawa", bg: P.forest, ink: P.cream },
    { value: plural(data.longest_streak, "day"), label: "longest streak", bg: P.deep, ink: P.marigold },
    { value: busiestDayText(data.busiest_day), label: "busiest day", bg: P.clay, ink: P.cream },
  ];
  const gap = 34;

  return (
    <Poster bg={P.forest} label={`Your ${month} on Sortify, all together.`}>
      {/* Polka dots drift up, exactly one row per loop */}
      <Loop style={styles.abs} from={{ translateY: 0 }} to={{ translateY: -gap }} duration={2600} back={false}>
        <Dots width={size.w + gap} height={size.h + gap * 2} color={P.deep} gap={gap} radius={7} />
      </Loop>
      <Loop style={[styles.abs, { bottom: inset.bottom + 40, left: -30 }]} from={{ rotate: "4deg" }} to={{ rotate: "-4deg" }} duration={3000}>
        <Scribble width={size.w * 0.9} height={size.w * 0.36} color={P.marigold} />
      </Loop>

      {/* Room at the bottom for the Share and Done buttons */}
      <Column inset={{ top: inset.top, bottom: inset.bottom + 70 }}>
        <View style={styles.grow} />
        <Rise from="pop" delay={150}>
          <View style={[styles.poster, { backgroundColor: P.cream }]}>
            <View style={styles.posterHead}>
              <RecycleArrows size={26} top={P.terracotta} bottom={P.forest} />
              <Text style={[s.eyebrow, { color: P.forest }]}>SORTIFY WRAPPED · {data.year}</Text>
            </View>
            {/* Long months (SEPTEMBER) a little smaller so they still fit on one line */}
            <Text style={[s.posterTitle, month.length > 7 && s.posterTitleLong, { color: P.forest }]} allowFontScaling={false}>
              {month.toUpperCase()}
            </Text>
            <View style={styles.tiles}>
              {tiles.map((t, i) => (
                <Rise key={t.label} from={i % 2 ? "right" : "left"} delay={350 + i * 90} style={[styles.tile, { backgroundColor: t.bg }]}>
                  <Text style={[s.tileValue, { color: t.ink }]} numberOfLines={1} adjustsFontSizeToFit>
                    {t.value}
                  </Text>
                  <Text style={[s.tileLabel, { color: t.ink }]}>{t.label}</Text>
                </Rise>
              ))}
            </View>
            {data.rarest_find ? (
              <Rise from="below" delay={950} style={[styles.rarest, { backgroundColor: P.deep }]}>
                <Text style={[s.tileLabel, { color: P.marigold }]}>RAREST FIND</Text>
                <Text style={[s.tileValue, styles.flexText, { color: P.cream }]} numberOfLines={1} adjustsFontSizeToFit>
                  {data.rarest_find.name}
                </Text>
              </Rise>
            ) : null}
          </View>
        </Rise>
      </Column>
    </Poster>
  );
}

const styles = StyleSheet.create({
  abs: { position: "absolute" },
  grow: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  centered: { textAlign: "center" },
  column: { flex: 1, paddingHorizontal: GUTTER },
  columnEnd: { justifyContent: "flex-end" },
  numberRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  band: { marginVertical: 3 },
  bandLeft: { alignSelf: "flex-start", marginLeft: -GUTTER - 6 },
  bandRight: { alignSelf: "flex-end", marginRight: -GUTTER - 6 },
  bandInner: { paddingHorizontal: 18, paddingVertical: 2 },
  spotText: { paddingHorizontal: 36, gap: 6 },
  pill: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 10 },
  podium: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 8, overflow: "hidden" },
  step: { width: "26%", alignItems: "center", paddingTop: 10, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  poster: { borderRadius: 28, padding: 18, gap: 10, transform: [{ rotate: "-2deg" }] },
  posterHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { width: "48.5%", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10 },
  rarest: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  flexText: { flex: 1 },
});

// Big type: lineHeight equals the size so tall letters never get clipped on Android
const useStyles = makeStyles(() => ({
  eyebrow: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 3 },
  mega: { fontFamily: fonts.poster, fontSize: 132, lineHeight: 140, letterSpacing: -5, includeFontPadding: false },
  huge: { fontFamily: fonts.poster, fontSize: 70, lineHeight: 76, letterSpacing: -2.5, includeFontPadding: false },
  big: { fontFamily: fonts.poster, fontSize: 40, lineHeight: 46, letterSpacing: -1 },
  statement: { fontFamily: fonts.posterBold, fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  line: { fontFamily: fonts.posterBold, fontSize: 22, lineHeight: 28 },
  body: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 24 },
  gapAbove: { marginTop: 14 },
  pill: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 2 },
  posterTitle: { fontFamily: fonts.poster, fontSize: 52, lineHeight: 56, letterSpacing: -1.5 },
  posterTitleLong: { fontSize: 42, lineHeight: 48 },
  tileValue: { fontFamily: fonts.poster, fontSize: 28, lineHeight: 34 },
  tileLabel: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17 },
}));
