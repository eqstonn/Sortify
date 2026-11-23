// The floating dark-green pill at the bottom: Home, Board, [Scan], Wrapped, Me.
//
// - Each tab is an icon with its label underneath. The open tab gets a lighter
//   pill behind its icon and a bold cream label.
// - Scan is a raised terracotta circle with a cream ring, sitting in the middle
//   slot and poking out above the bar. It opens app/scan.tsx over everything.
//
// Sizes are from the mockups (assets/redesign, 2x images, halved).

import { router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { ChartNoAxesColumn, Focus, House, type LucideIcon, Star, User } from "lucide-react-native";
import { Text, View } from "react-native";

import { Sheen } from "@/components/Card";
import PressableScale from "@/components/PressableScale";
import { NAV_HEIGHT, navBottom } from "@/components/Screen";
import { makeStyles, useTheme } from "@/lib/theme";
import { fonts } from "@/theme";

const ICONS: Record<string, LucideIcon> = {
  index: House,
  board: ChartNoAxesColumn,
  wrapped: Star,
  me: User,
};

const BORDER = 2;
const SLOT = 70; // each of the five slots is this wide
const SCAN = 64; // the terracotta circle, edge included
const RING = 4; // the cream ring around it
const SCAN_RISE = 16; // how far the ring pokes out above the bar

export default function NavBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { colors } = useTheme();
  const s = useStyles();

  const tabs = state.routes.map((route, index) => {
    const focused = state.index === index;
    const label = descriptors[route.key].options.title ?? route.name;
    const Icon = ICONS[route.name] ?? Star;
    const ink = focused ? colors.onForest : colors.onForestMuted;

    const onPress = () => {
      const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigateToTab(route.key);
    };

    return (
      <PressableScale
        key={route.key}
        onPress={onPress}
        style={s.slot}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
      >
        <View style={[s.iconPill, focused && s.iconPillOn]}>
          <Icon size={22} color={ink} strokeWidth={2} />
        </View>
        <Text style={[s.label, focused ? s.labelOn : { color: ink }]} numberOfLines={1}>
          {label}
        </Text>
      </PressableScale>
    );
  });

  // Two tabs, the Scan slot, then the other two
  const middle = Math.ceil(tabs.length / 2);

  return (
    <View style={[s.wrap, { bottom: navBottom(insets.bottom) }]}>
      <View style={s.bar}>
        <Sheen top={colors.forestTop} bottom={colors.forestBottom} shine={colors.forestShine} radius={NAV_HEIGHT / 2 - BORDER} />
        {tabs.slice(0, middle)}
        <View style={s.slot}>
          <PressableScale
            onPress={() => router.push("/scan")}
            style={s.scanRing}
            accessibilityRole="button"
            accessibilityLabel="Scan an item"
          >
            <View style={s.scan}>
              <Sheen top={colors.terracottaTop} bottom={colors.terracottaBottom} shine={colors.terracottaShine} radius={SCAN / 2 - BORDER} />
              {/* In a View: on web a bare icon would be painted under the gradient */}
              <View>
                <Focus size={28} color={colors.onTerracotta} strokeWidth={2.25} />
              </View>
            </View>
          </PressableScale>
        </View>
        {tabs.slice(middle)}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  // Spans the screen only to centre the bar; taps beside the bar reach the screen
  wrap: { position: "absolute", left: 15, right: 15, alignItems: "center", pointerEvents: "box-none" },
  bar: {
    width: "100%",
    maxWidth: SLOT * 5 + 10,
    height: NAV_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: NAV_HEIGHT / 2,
    borderWidth: BORDER,
    borderColor: colors.forestEdge,
    backgroundColor: colors.forest,
    boxShadow: "0px 8px 16px 0px rgba(19, 41, 30, 0.22)", // the soft shadow under the floating bar
  },
  slot: { width: SLOT, height: "100%", alignItems: "center", justifyContent: "center", gap: 3 },
  iconPill: { width: 46, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  iconPillOn: { backgroundColor: colors.navActive },
  label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 15 },
  labelOn: { fontFamily: fonts.bold, color: colors.onForest },

  // The ring is the page colour, so the circle looks cut out of the bar
  scanRing: {
    position: "absolute",
    top: -(SCAN_RISE + BORDER),
    width: SCAN + RING * 2,
    height: SCAN + RING * 2,
    borderRadius: (SCAN + RING * 2) / 2,
    padding: RING,
    backgroundColor: colors.page,
  },
  scan: {
    flex: 1,
    borderRadius: SCAN / 2,
    borderWidth: BORDER,
    borderColor: colors.terracottaEdge,
    backgroundColor: colors.terracotta,
    alignItems: "center",
    justifyContent: "center",
  },
}));
