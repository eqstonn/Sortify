// Board's podium: the top three as terracotta pots, #2 #1 #3 left to right.
// Each pot has the player's avatar planted in it between two leaves, their name
// on the rim, and their rank and points on the pot. #1 is tallest, with a gold
// ring and a crown. The pots run on below the area's bottom edge, where the
// sheet covers them (assets/redesign "Leaderboard").

import { Text, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import Avatar, { avatarUri } from "@/components/Avatar";
import type { LeaderboardEntry } from "@/lib/api";
import { makeStyles, useTheme } from "@/lib/theme";
import { fonts } from "@/theme";

const POT_W = 106;
const RIM_H = 26;
const HIDDEN = 40; // how far each pot carries on under the sheet

// How much of each pot (rim included) shows above the sheet, by place
const SHOWN = [125, 95, 78];
const AVATAR = [60, 50, 50];

// Pot colours from the mockup (terracotta, darker clay outline, soil)
const CLAY = { rimTop: "#D07B50", rimBottom: "#B4603D", bodyLeft: "#CC7247", bodyRight: "#A4532F", edge: "#3A2418", soil: "#4A2B1E" };

/** The podium's height above the sheet. */
export const PODIUM_HEIGHT = 250;

export default function Podium({ top }: { top: LeaderboardEntry[] }) {
  const s = useStyles();
  const order = [1, 0, 2]; // #2, #1, #3
  return (
    <View style={[s.podium, { height: PODIUM_HEIGHT + HIDDEN }]} testID="podium">
      {order.map((i) => (
        <View key={i} style={s.place}>
          {top[i] ? <Place entry={top[i]} place={i} /> : null}
        </View>
      ))}
    </View>
  );
}

function Place({ entry, place }: { entry: LeaderboardEntry; place: number }) {
  const { colors } = useTheme();
  const s = useStyles();
  const first = place === 0;
  const size = AVATAR[place];
  const name = entry.is_me ? "You" : entry.name;
  return (
    <View style={s.column} accessible accessibilityLabel={`Place ${place + 1}: ${name}, ${entry.points} points`}>
      {first ? <Crown /> : null}
      <View style={[s.planted, { height: size }]}>
        <Leaf side="left" style={[s.leaf, { right: POT_W / 2 + size / 2 - 14 }]} />
        <Leaf side="right" style={[s.leaf, { left: POT_W / 2 + size / 2 - 14 }]} />
        <Avatar
          uri={avatarUri(entry.avatar)}
          size={size}
          ring
          ringWidth={first ? 3 : 2}
          ringColor={first ? colors.gold : colors.line}
        />
      </View>
      <Pot height={SHOWN[place] + HIDDEN} first={first} name={name} rank={entry.rank} points={entry.points} />
    </View>
  );
}

function Pot({ height, first, name, rank, points }: { height: number; first: boolean; name: string; rank: number; points: number }) {
  const s = useStyles();
  const taper = (height - RIM_H) * 0.09; // the pot narrows towards the bottom
  const body = `M6 ${RIM_H} H${POT_W - 6} L${POT_W - 6 - taper} ${height} H${6 + taper} Z`;
  return (
    <View style={[s.pot, { height }]}>
      <Svg width={POT_W} height={height} style={s.potArt}>
        <Defs>
          <LinearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={CLAY.rimTop} />
            <Stop offset="1" stopColor={CLAY.rimBottom} />
          </LinearGradient>
          <LinearGradient id="body" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={CLAY.bodyLeft} />
            <Stop offset="1" stopColor={CLAY.bodyRight} />
          </LinearGradient>
        </Defs>
        <Path d={body} fill="url(#body)" stroke={CLAY.edge} strokeWidth={1.5} strokeLinejoin="round" />
        {/* the shine down the left side */}
        <Rect x={13} y={RIM_H + 12} width={7} height={(height - RIM_H) * 0.55} rx={3.5} fill="#FFFFFF" opacity={0.2} />
        <Rect x={0.75} y={0.75} width={POT_W - 1.5} height={RIM_H} rx={9} fill="url(#rim)" stroke={CLAY.edge} strokeWidth={1.5} />
        <Ellipse cx={POT_W / 2} cy={5} rx={POT_W / 2 - 9} ry={4} fill={CLAY.soil} />
      </Svg>
      <Text style={s.name} numberOfLines={1} adjustsFontSizeToFit>
        {name}
      </Text>
      <Text style={[s.rank, first && s.rankFirst]}>{rank}</Text>
      <Text style={s.points}>{points.toLocaleString()} pts</Text>
    </View>
  );
}

// A leaf sticking out from behind the avatar, tip up and outwards
function Leaf({ side, style }: { side: "left" | "right"; style: object }) {
  const flip = side === "right" ? { transform: [{ scaleX: -1 }] } : null;
  return (
    <Svg width={46} height={34} viewBox="0 0 46 34" style={[style, flip]}>
      <Path d="M44 32C30 33 8 26 2 4C18 1 38 10 44 32Z" fill="#5E8C3E" stroke="#2B3A24" strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M43 31C30 24 16 15 6 6" stroke="#2B3A24" strokeWidth={1} opacity={0.5} fill="none" />
    </Svg>
  );
}

function Crown() {
  const { colors } = useTheme();
  const s = useStyles();
  return (
    <Svg width={40} height={30} viewBox="0 0 40 30" style={s.crown} testID="crown">
      <Path d="M5 26L3 9L13 17L20 5L27 17L37 9L35 26Z" fill={colors.gold} stroke="#3A2A12" strokeWidth={1.5} strokeLinejoin="round" />
      <Circle cx={3} cy={8} r={2.6} fill={colors.gold} stroke="#3A2A12" strokeWidth={1.2} />
      <Circle cx={20} cy={4} r={2.6} fill={colors.gold} stroke="#3A2A12" strokeWidth={1.2} />
      <Circle cx={37} cy={8} r={2.6} fill={colors.gold} stroke="#3A2A12" strokeWidth={1.2} />
    </Svg>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  podium: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 8 },
  place: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  column: { alignItems: "center", width: POT_W },
  crown: { marginBottom: -9, zIndex: 1 },
  // The avatar sits 10 pt down inside the pot, behind the rim
  planted: { width: POT_W, alignItems: "center", marginBottom: -10 },
  leaf: { position: "absolute", bottom: 6 },
  pot: { width: POT_W, alignItems: "center" },
  potArt: { position: "absolute", top: 0, left: 0 },
  name: { height: RIM_H, lineHeight: RIM_H, paddingHorizontal: 8, fontFamily: fonts.heading, fontSize: 14, color: colors.onTerracotta },
  rank: { marginTop: 2, fontFamily: fonts.heading, fontSize: 28, lineHeight: 32, color: colors.onTerracotta },
  rankFirst: { marginTop: 8, fontSize: 44, lineHeight: 50 },
  points: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17, color: colors.onTerracotta },
}));
