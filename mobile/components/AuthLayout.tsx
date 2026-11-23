// The frame of the sign-in, create-account and new-password screens: the logo
// at the top, the plant peeking in from the right, and a cream sheet holding
// the form (assets/redesign "Sign in"). Plus the small pieces those forms share.

import { Image } from "expo-image";
import { Check, Eye, EyeOff, Lock } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import HeroSheet from "@/components/HeroSheet";
import Logo from "@/components/Logo";
import Screen from "@/components/Screen";
import TextField from "@/components/TextField";
import { plantArt } from "@/lib/plant";
import { makeStyles, useTheme } from "@/lib/theme";
import { fonts } from "@/theme";

/** Good enough to catch typos; Supabase checks properly. */
export const EMAIL = /^\S+@\S+\.\S+$/;

const HERO_MAX = 249; // the mockup's gap above the sheet on a normal phone
const HERO_MIN = 150; // on a short phone, less gap so the form fits
const FORM_HEIGHT = 540; // roughly the sign-in form's height
const PLANT = 330;

type Props = { title: string; subtitle: string; children: ReactNode; testID?: string };

export default function AuthLayout({ title, subtitle, children, testID }: Props) {
  const [area, setArea] = useState(0);
  const s = useStyles();
  const hero = area ? Math.round(Math.min(HERO_MAX, Math.max(HERO_MIN, area - FORM_HEIGHT))) : HERO_MAX;

  return (
    <Screen>
      <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <HeroSheet
          testID={testID}
          heroHeight={hero}
          bottomSpace={24}
          handle={false}
          onAreaHeight={setArea}
          sheetStyle={s.sheet}
          hero={
            // Peeks in from the right edge (clipped there on a wide window); the sheet hides its pot
            <View style={s.clip}>
              <Image
                source={plantArt(3).poster}
                style={[s.plant, { top: hero - 230 }]}
                contentFit="contain"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            </View>
          }
          // The logo stays put; the sheet slides over it if the form is scrolled up
          pinned={
            <View style={s.logo}>
              <Logo width={134} />
            </View>
          }
        >
          <Text style={s.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={s.subtitle}>{subtitle}</Text>
          {children}
        </HeroSheet>
      </KeyboardAvoidingView>
    </Screen>
  );
}

type PasswordProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  isNew?: boolean; // creating a password: lets the phone suggest a strong one
  onSubmitEditing?: () => void;
};

/** A password box with the lock icon and the eye that shows or hides what you typed. */
export function PasswordField({ label, value, onChangeText, placeholder, isNew, onSubmitEditing }: PasswordProps) {
  const [shown, setShown] = useState(false);
  const { colors } = useTheme();
  const Toggle = shown ? EyeOff : Eye;
  return (
    <TextField
      label={label}
      icon={Lock}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      secureTextEntry={!shown}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={isNew ? "new-password" : "current-password"}
      textContentType={isNew ? "newPassword" : "password"}
      returnKeyType="go"
      onSubmitEditing={onSubmitEditing}
      right={
        <Pressable
          onPress={() => setShown(!shown)}
          accessibilityRole="button"
          accessibilityLabel={shown ? "Hide password" : "Show password"}
          hitSlop={10}
        >
          <Toggle size={22} color={colors.text} strokeWidth={1.75} />
        </Pressable>
      }
    />
  );
}

/** The green tick box ("Remember me"). */
export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  const { colors } = useTheme();
  const s = useStyles();
  return (
    <Pressable
      style={s.checkRow}
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      hitSlop={8}
    >
      <View style={[s.box, checked && s.boxOn]}>
        {checked ? <Check size={15} color={colors.onForest} strokeWidth={3} /> : null}
      </View>
      <Text style={s.checkLabel}>{label}</Text>
    </Pressable>
  );
}

/** Terracotta underlined text that's a button ("Forgot password?", "Create an account"). */
export function TextLink({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const s = useStyles();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" hitSlop={8}>
      <Text style={s.link}>{label}</Text>
    </Pressable>
  );
}

/** "———— or continue with ————" */
export function OrDivider() {
  const s = useStyles();
  return (
    <View style={s.divider}>
      <View style={s.line} />
      <Text style={s.or}>or continue with</Text>
      <View style={s.line} />
    </View>
  );
}

/** A line under the form: an error in terracotta, or good news ("check your email") in green. */
export function FormMessage({ text, tone }: { text: string | null; tone: "error" | "info" }) {
  const s = useStyles();
  if (!text) return null;
  return (
    <Text style={[s.message, tone === "error" ? s.error : s.info]} accessibilityLiveRegion="polite" testID={`form-${tone}`}>
      {text}
    </Text>
  );
}

/** The last line: "New to Sortify? Create an account" */
export function Footer({ text, link, onPress }: { text: string; link: string; onPress: () => void }) {
  const s = useStyles();
  return (
    <View style={s.footer}>
      <Text style={s.footerText}>{text} </Text>
      <TextLink label={link} onPress={onPress} />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  fill: { flex: 1 },
  sheet: { paddingHorizontal: 22, paddingTop: 24 },
  logo: { alignItems: "center", paddingTop: 31 },
  clip: { ...StyleSheet.absoluteFill, overflow: "hidden" },
  plant: { position: "absolute", right: -75, width: PLANT, height: PLANT },

  title: { fontFamily: fonts.heading, fontSize: 32, lineHeight: 38, letterSpacing: -0.3, color: colors.text, textAlign: "center" },
  subtitle: { marginTop: 4, marginBottom: 22, fontFamily: fonts.medium, fontSize: 16, lineHeight: 21, color: colors.textMuted, textAlign: "center" },

  checkRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { backgroundColor: colors.progress, borderColor: colors.progress },
  checkLabel: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },

  link: { fontFamily: fonts.semibold, fontSize: 15, color: colors.terracotta, textDecorationLine: "underline" },

  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 16 },
  line: { flex: 1, height: 1, backgroundColor: colors.divider },
  or: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },

  message: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, textAlign: "center", marginTop: 14 },
  error: { color: colors.terracotta },
  info: { color: colors.progress },

  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 18 },
  footerText: { fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted },
}));
