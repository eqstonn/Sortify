// The cream panel with a rounded top and a grab handle that sits over the hero
// art on Home, Board, Me and sign-in. It's part of the page (it scrolls with
// the content), not a pop-up; for pop-ups see components/Sheet.tsx.
//
// Two soft blobs live inside it, like in the mockups. The edge is drawn on top
// of them as a separate layer so a blob never covers it.

import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

import { Blob, type BlobShape } from "@/components/Backdrop";
import { makeStyles, useTheme } from "@/lib/theme";
import { radius } from "@/theme";

const INNER_BLOBS: BlobShape[] = [
  { w: 120, h: 160, at: { top: 0, left: 0 }, d: "M0 0H118C108 50 64 110 0 158Z" },
  { w: 40, h: 150, at: { top: 220, right: 0 }, d: "M40 0C14 10 0 40 0 75C0 110 14 140 40 150Z" },
];

type Props = { children: ReactNode; style?: StyleProp<ViewStyle>; handle?: boolean; testID?: string };

export default function SheetPanel({ children, style, handle = true, testID }: Props) {
  const { colors } = useTheme();
  const s = useStyles();
  return (
    <View style={[s.panel, style]} testID={testID}>
      <View style={s.clip}>
        {INNER_BLOBS.map((b, i) => (
          <Blob key={i} shape={b} color={colors.blob} />
        ))}
      </View>
      <View style={s.edge} />
      {handle ? <View style={s.handle} /> : null}
      {children}
    </View>
  );
}

const SHEET_LINE = 2; // the mockup's sheet edge is a little bolder than a card's

const useStyles = makeStyles(({ colors }) => ({
  panel: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  // Blobs are clipped to the rounded top
  clip: {
    ...StyleSheet.absoluteFill,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    overflow: "hidden",
    pointerEvents: "none",
  },
  // A top border only: with rounded corners it gets thinner as it curves down
  // and fades out at the screen edge, like the mockup (a full-width side
  // border would end in a flat cut instead)
  edge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: radius.sheet,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: SHEET_LINE,
    borderColor: colors.line,
    pointerEvents: "none",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.handle,
    marginTop: 12,
    marginBottom: 16,
  },
}));
