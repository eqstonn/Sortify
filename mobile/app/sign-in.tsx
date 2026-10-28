// First launch: pick a name and avatar. Behind the scenes the player is an
// anonymous Supabase user; this just names them for the leaderboard.

import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Avatar } from "@/lib/api";
import { AVATAR_IDS, AVATARS } from "@/lib/avatars";
import { useSession } from "@/lib/session";
import { colors, fonts, radius, spacing, type } from "@/theme";

const MAX_NAME = 30; // same limit as ProfileUpdate in app/schemas.py

export default function SignIn() {
  const { signIn } = useSession();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<Avatar>("sprout");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = name.trim().length > 0 && !busy;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(name, avatar); // the layout then swaps this screen for Home
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't sign in. Try again.");
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.hero}>{AVATARS[avatar]}</Text>
          <Text style={type.caption}>Welcome to Sortify</Text>
          <Text style={[type.title, styles.title]}>What should we call you?</Text>
          <Text style={type.caption}>Your name and avatar show on the Ottawa leaderboard.</Text>

          <View style={styles.card}>
            <Text style={type.label}>NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sam"
              placeholderTextColor={colors.textMuted}
              maxLength={MAX_NAME}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={submit}
              style={styles.input}
              accessibilityLabel="Your name"
            />
          </View>

          <View style={styles.card}>
            <Text style={type.label}>AVATAR</Text>
            <View style={styles.grid}>
              {AVATAR_IDS.map((id) => {
                const selected = id === avatar;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setAvatar(id)}
                    style={[styles.avatar, selected && styles.avatarSelected]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={id}
                  >
                    <Text style={styles.avatarEmoji}>{AVATARS[id]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <Pressable
          onPress={submit}
          disabled={!ready}
          style={({ pressed }) => [styles.button, !ready && styles.buttonDisabled, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
        >
          {busy ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.buttonText}>Start sorting</Text>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 52;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md },
  hero: { fontSize: 56, marginBottom: spacing.sm },
  title: { marginTop: -spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  input: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  avatarSelected: { borderColor: colors.primary },
  avatarEmoji: { fontSize: 26 },
  error: { ...type.body, color: colors.danger },
  button: {
    margin: spacing.xl,
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontFamily: fonts.bold, fontSize: 17, color: colors.onPrimary },
});
