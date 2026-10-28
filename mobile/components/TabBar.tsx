// The bottom bar from 01-home.png: four tabs with a raised green Scan button in the middle.

import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius } from "@/theme";

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  index: "home",
  board: "bar-chart-2",
  wrapped: "star",
  me: "user",
};

const SCAN_SIZE = 64;

export default function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const tabs = state.routes.map((route, index) => {
    const focused = state.index === index;
    const label = descriptors[route.key].options.title ?? route.name;
    const color = focused ? colors.text : colors.textMuted;

    const onPress = () => {
      const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigateToTab(route.key);
    };

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        style={styles.tab}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
      >
        <Feather name={ICONS[route.name] ?? "circle"} size={22} color={color} />
        <Text style={[styles.label, { color }, focused && styles.labelFocused]}>{label}</Text>
      </Pressable>
    );
  });

  // Two tabs, the Scan button, then the other two
  const middle = Math.ceil(tabs.length / 2);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {tabs.slice(0, middle)}
      <View style={styles.tab}>
        <Pressable
          onPress={() => router.push("/scan")}
          style={({ pressed }) => [styles.scan, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="Scan an item"
        >
          <MaterialCommunityIcons name="image-filter-center-focus" size={28} color={colors.onPrimary} />
        </Pressable>
      </View>
      {tabs.slice(middle)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  tab: { flex: 1, alignItems: "center", gap: 4 },
  label: { fontFamily: fonts.medium, fontSize: 11 },
  labelFocused: { fontFamily: fonts.bold },
  scan: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    borderRadius: SCAN_SIZE / 2,
    marginTop: -SCAN_SIZE / 2 - 4, // sits half above the bar
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
