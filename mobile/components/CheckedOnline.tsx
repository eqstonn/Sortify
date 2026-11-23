// On the result screen, for items that aren't in Sortify's list:
// - looked up online: what the search found, its sources, and a link to
//   double-check in the City's Waste Explorer
// - marked "Something else": just the Waste Explorer link
// (The result screen is still in the older glass style, so this matches it.)

import { ExternalLink, Globe } from "lucide-react-native";
import { Linking, Pressable, Text, View } from "react-native";

import GlassCard from "@/components/GlassCard";
import { type OnlineCheck, WASTE_EXPLORER_URL } from "@/lib/api";
import { makeStyles, useTheme } from "@/lib/theme";
import { fonts, spacing } from "@/theme";

export default function CheckedOnline({ check }: { check?: OnlineCheck | null }) {
  const { colors, type } = useTheme();
  const s = useStyles();
  return (
    <GlassCard testID="checked-online">
      <View style={s.heading}>
        <Globe size={18} color={colors.text} strokeWidth={2} />
        <Text style={type.heading}>{check ? "Checked online" : "Not in Sortify's list"}</Text>
      </View>
      <Text style={type.body}>
        {check ? check.summary : "Not sure where it goes? The City's Waste Explorer covers most household items."}
      </Text>
      {check?.sources.length ? (
        <View style={s.sources}>
          <Text style={type.caption}>Sources</Text>
          {check.sources.map((src) => (
            <Link key={src.url} label={src.title} url={src.url} />
          ))}
        </View>
      ) : null}
      <Link label="Double-check in the City's Waste Explorer" url={WASTE_EXPLORER_URL} />
    </GlassCard>
  );
}

function Link({ label, url }: { label: string; url: string }) {
  const { colors } = useTheme();
  const s = useStyles();
  return (
    <Pressable onPress={() => Linking.openURL(url)} accessibilityRole="link" accessibilityLabel={label} hitSlop={6} style={s.link}>
      <Text style={s.linkText} numberOfLines={1}>
        {label}
      </Text>
      <ExternalLink size={14} color={colors.terracotta} strokeWidth={2} />
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  heading: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sources: { gap: spacing.xs },
  link: { flexDirection: "row", alignItems: "center", gap: 6 },
  linkText: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.terracotta, textDecorationLine: "underline" },
}));
