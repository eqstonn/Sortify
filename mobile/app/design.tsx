// Dev only: every shared piece of the redesign on one page, to check the look
// on a phone and in the browser (http://localhost:8081/design). Not reachable
// in a release build.

import { Redirect, router } from "expo-router";
import { ChevronRight, Eye, EyeOff, Flame, Leaf, Lock, Mail, Pizza, Trash2, Trophy } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import ActionButton from "@/components/ActionButton";
import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import IconTile from "@/components/IconTile";
import Logo from "@/components/Logo";
import Pill from "@/components/Pill";
import ProgressBar from "@/components/ProgressBar";
import Screen from "@/components/Screen";
import SheetPanel from "@/components/SheetPanel";
import TextField from "@/components/TextField";
import { makeStyles, useTheme } from "@/lib/theme";
import { chunky, fonts, layout, radius, spacing } from "@/theme";

export default function Design() {
  const [secret, setSecret] = useState(true);
  const { colors, type } = useTheme();
  const s = useStyles();

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <Screen edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.row}>
          <Text style={type.title}>Design system</Text>
          <Pressable onPress={() => router.back()} accessibilityRole="button" style={s.close}>
            <Text style={s.link}>Close</Text>
          </Pressable>
        </View>

        <Logo width={160} style={s.center} />

        <Text style={type.label}>TYPE</Text>
        <Text style={type.caption}>Good evening, Easton</Text>
        <Text style={type.title}>Your garden is growing</Text>
        <Text style={type.display}>1,240</Text>
        <Text style={type.heading}>Discover weekly</Text>
        <Text style={type.cardTitle}>Pizza boxes</Text>
        <Text style={type.body}>Body text in DM Sans.</Text>
        <Text style={type.caption}>Muted caption text.</Text>

        <Text style={type.label}>CARDS</Text>
        <Card style={s.cardRow} radius={radius.card} padding={14}>
          <IconTile icon={Trash2} tone="terracotta" size={42} />
          <View style={s.flex}>
            <Text style={type.label}>UP NEXT</Text>
            <Text style={type.cardTitle}>Black + green bin · Tue, Oct 27</Text>
          </View>
          <ChevronRight size={22} color={colors.text} />
        </Card>

        <View style={s.tiles}>
          <Tile value="12" label="items this week" icon={<Leaf size={16} color={colors.text} />} />
          <Tile value="4 days" label="streak" icon={<Flame size={16} color={colors.text} />} />
          <Tile value="#8" label="in Ottawa" icon={<Trophy size={16} color={colors.text} />} />
        </View>

        <Card tone="forest" radius={radius.card} padding={16}>
          <Text style={[type.stat, { color: colors.onForest }]}>1,240</Text>
          <Text style={[type.caption, { color: colors.onForest }]}>total points (forest card)</Text>
        </Card>

        <Card style={s.cardRow} onPress={() => {}} accessibilityLabel="Pizza boxes">
          <IconTile icon={Pizza} />
          <View style={s.flex}>
            <Text style={type.cardTitle}>Pizza boxes</Text>
            <Text style={type.caption}>Greasy ones go in the green bin</Text>
          </View>
          <ChevronRight size={22} color={colors.text} />
        </Card>

        <Text style={type.label}>LEVEL</Text>
        <View style={s.row}>
          <Text style={type.display}>1,240</Text>
          <Pill label="Level 3 · Sapling" />
        </View>
        <ProgressBar value={0.68} label="Level progress" />

        <Text style={type.label}>BUTTONS</Text>
        <ActionButton label="Sign in" onPress={() => {}} />
        <ActionButton label="Google" variant="secondary" onPress={() => {}} />
        <ActionButton label="Terracotta" variant="accent" onPress={() => {}} />
        <ActionButton label="Busy" busy onPress={() => {}} />

        <Text style={type.label}>INPUTS</Text>
        <TextField label="Email" icon={Mail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
        <TextField
          label="Password"
          icon={Lock}
          placeholder="Your password"
          secureTextEntry={secret}
          right={
            <Pressable onPress={() => setSecret((v) => !v)} hitSlop={10} accessibilityRole="button" accessibilityLabel={secret ? "Show password" : "Hide password"}>
              {secret ? <Eye size={22} color={colors.text} /> : <EyeOff size={22} color={colors.text} />}
            </Pressable>
          }
        />

        <Text style={type.label}>AVATARS</Text>
        <View style={s.row}>
          <Avatar size={46} ring depth={chunky.band} />
          <Avatar size={40} ring />
          <Avatar size={64} ring ringColor={colors.gold} ringWidth={3} />
          <Avatar size={84} ring depth={chunky.band} />
        </View>

        <Text style={type.label}>SHEET</Text>
        <SheetPanel style={s.sheet}>
          <Text style={type.body}>The rounded panel that slides over the hero art.</Text>
        </SheetPanel>
      </ScrollView>
    </Screen>
  );
}

function Tile({ value, label, icon }: { value: string; label: string; icon: ReactNode }) {
  const { type } = useTheme();
  const s = useStyles();
  return (
    <Card style={s.tile} radius={radius.tile} depth={chunky.bandSmall} padding={12}>
      <View style={s.tileTop}>
        <Text style={type.stat} numberOfLines={1}>
          {value}
        </Text>
        {icon}
      </View>
      <Text style={type.caption}>{label}</Text>
    </Card>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  content: { padding: layout.gutter, gap: spacing.md, paddingBottom: 80 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  close: { padding: spacing.sm },
  link: { fontFamily: fonts.semibold, fontSize: 15, color: colors.terracotta, textDecorationLine: "underline" },
  center: { alignSelf: "center", marginVertical: spacing.lg },
  flex: { flex: 1 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  tiles: { flexDirection: "row", gap: spacing.md },
  tile: { flex: 1, minHeight: 80 },
  tileTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  sheet: { marginHorizontal: -layout.gutter, minHeight: 200 },
}));
