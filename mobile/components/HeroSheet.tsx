// The layout under a screen's fixed header on Home, Board, Me and sign-in:
// hero art (the plant, the podium) sits still in the background, and a cream
// sheet starts below it and scrolls up over it.
//
// How it works: a ScrollView fills the area below the header. Its content
// starts with an empty gap as tall as the hero, so at first you see the hero
// through the gap; scrolling moves the sheet up over the hero. The ScrollView
// ends at the header, so the sheet slides under the header's bottom edge
// (compare assets/redesign "Home" with "Sheet pulled up").
//
// The art stops where the sheet covers it (the plant PNGs end partway down the
// pot). So when you pull the sheet down past the top (iOS bounce, pull to
// refresh), the hero moves down with it and that cut never shows. Scrolling up
// leaves the hero still.

import { type ReactNode, useState } from "react";
import { Animated, Platform, RefreshControl, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import SheetPanel from "@/components/SheetPanel";
import { useTheme } from "@/lib/theme";

type Props = {
  hero: ReactNode; // drawn behind, from the top of this area; may hang below heroHeight (the sheet covers it)
  heroHeight: number; // how much of the hero shows before you scroll
  pinned?: ReactNode; // drawn behind the sheet like the hero, but never moves (sign-in's logo)
  over?: ReactNode; // tappable content in the gap above the sheet, scrolling with it (Me's name and edit button)
  children: ReactNode; // the sheet's content
  bottomSpace: number; // room at the end of the sheet for the nav (and anything pinned above it)
  refreshing?: boolean;
  onRefresh?: () => void;
  onAreaHeight?: (height: number) => void; // the area's height, for sizing the hero
  sheetStyle?: StyleProp<ViewStyle>;
  handle?: boolean; // the sheet's grab handle (sign-in has none)
  testID?: string; // given to the ScrollView
};

const nativeDriver = Platform.OS !== "web";

export default function HeroSheet({
  hero, heroHeight, pinned, over, children, bottomSpace, refreshing, onRefresh, onAreaHeight, sheetStyle, handle, testID,
}: Props) {
  const { colors } = useTheme();
  const [areaHeight, setAreaHeight] = useState(0);

  // How far the content is scrolled; below 0 while it's pulled down past the top
  const [scrollY] = useState(() => new Animated.Value(0));
  const [onScroll] = useState(() =>
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: nativeDriver }),
  );
  // Pulled down 30 pt: hero 30 pt down too. Scrolled up: hero stays put.
  const [follow] = useState(() =>
    scrollY.interpolate({ inputRange: [-1, 0], outputRange: [1, 0], extrapolateLeft: "extend", extrapolateRight: "clamp" }),
  );

  return (
    <View
      style={styles.area}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        setAreaHeight(h);
        onAreaHeight?.(h);
      }}
    >
      {/* The hero can't be tapped: drags on it scroll the sheet */}
      <Animated.View style={[styles.layer, { transform: [{ translateY: follow }] }]}>{hero}</Animated.View>
      {pinned ? <View style={styles.layer}>{pinned}</View> : null}
      <Animated.ScrollView
        testID={testID}
        style={styles.area}
        contentContainerStyle={over ? undefined : { paddingTop: heroHeight }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled" // a tap on a button works first time while the keyboard is up
        onScroll={onScroll}
        scrollEventThrottle={16}
        overScrollMode="never" // Android: no stretch past the ends (it would pull the sheet off the hero)
        refreshControl={
          onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined
        }
      >
        {over ? <View style={{ height: heroHeight }}>{over}</View> : null}
        {/* At least as tall as the area, so it can always be pulled all the way up */}
        <SheetPanel handle={handle} style={[{ minHeight: areaHeight, paddingBottom: bottomSpace }, sheetStyle]}>{children}</SheetPanel>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1 },
  layer: { ...StyleSheet.absoluteFill, pointerEvents: "none" },
});
