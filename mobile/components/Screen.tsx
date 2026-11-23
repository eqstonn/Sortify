// Every screen's frame: the blob background edge to edge, safe-area padding,
// and a content column capped at 500 px (wider than any phone) so nothing stretches on a wide window.
// useNavSpace() is how much room to leave at the bottom for the floating nav.

import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { type Edge, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Backdrop from "@/components/Backdrop";
import { layout, spacing } from "@/theme";

type Props = { children: ReactNode; edges?: Edge[]; style?: StyleProp<ViewStyle> };

export default function Screen({ children, edges = ["top"], style }: Props) {
  return (
    <View style={styles.fill}>
      <Backdrop />
      <SafeAreaView style={styles.fill} edges={edges}>
        <View style={[styles.column, style]}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

// The floating nav bar's height
export const NAV_HEIGHT = 70;

/**
 * How far the nav bar sits above the bottom of the screen. The mockup puts it
 * 18 pt up on an iPhone (whose home-bar safe area is 34 pt), so it dips a little
 * into the safe area; phones without one get 12 pt.
 */
export function navBottom(safeBottom: number): number {
  return Math.max(safeBottom - 16, 12);
}

/** Bottom padding for a tab screen's scroll content, so the last card clears the nav. */
export function useNavSpace(): number {
  const insets = useSafeAreaInsets();
  return navBottom(insets.bottom) + NAV_HEIGHT + spacing.lg;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { flex: 1, width: "100%", maxWidth: layout.maxContent, alignSelf: "center" },
});
