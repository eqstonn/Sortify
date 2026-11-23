// A player's round picture: their photo if they uploaded one, otherwise the
// standard grey circle with a white person. Used on Home, Board (rows and
// podium) and Me.
//
// ring: the dark-green edge and solid band the mockups put around avatars.

import { Image } from "expo-image";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { useTheme } from "@/lib/theme";
import { band, chunky } from "@/theme";

type Props = {
  uri?: string | null; // photo URL; null/undefined = the default person
  size: number;
  ring?: boolean;
  ringColor?: string; // e.g. gold for #1 on the podium
  ringWidth?: number;
  depth?: number; // band below; only with ring
  label?: string; // for screen readers; leave out when a name is shown next to it
  style?: StyleProp<ViewStyle>;
};

export default function Avatar({ uri, size, ring, ringColor, ringWidth = chunky.stroke, depth = 0, label, style }: Props) {
  const { colors } = useTheme();
  const round = { width: size, height: size, borderRadius: size / 2 };
  return (
    // Outer: edge and band. Inner: clips the photo to a circle (kept apart so the clip can't cut the band).
    <View
      style={[
        round,
        ring && { borderWidth: ringWidth, borderColor: ringColor ?? colors.line },
        ring && depth > 0 ? band(colors.band, depth) : null,
        style,
      ]}
      accessible={!!label}
      accessibilityRole={label ? "image" : undefined}
      accessibilityLabel={label}
      testID="avatar"
    >
      <View style={[styles.clip, { borderRadius: size / 2, backgroundColor: colors.avatarBg }]}>
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} testID="avatar-photo" />
        ) : (
          <Person color={colors.avatarFg} />
        )}
      </View>
    </View>
  );
}

// Head and shoulders, cut off by the circle
function Person({ color }: { color: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" testID="avatar-default">
      <Circle cx={50} cy={39} r={19} fill={color} />
      <Path d="M14 104C14 78 30 64 50 64C70 64 86 78 86 104Z" fill={color} />
    </Svg>
  );
}

/** The avatar field from the backend is a photo URL once the player uploads one; older values are emoji ids. */
export function avatarUri(avatar: string | null | undefined): string | null {
  return avatar && /^https?:\/\//.test(avatar) ? avatar : null;
}

const styles = StyleSheet.create({
  clip: { flex: 1, overflow: "hidden" },
});
