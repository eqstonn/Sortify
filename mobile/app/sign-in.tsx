// Sign in with email + password or Google (assets/redesign "Sign in").
// "Forgot password?" emails a reset link to the address typed above.
// Once Supabase says you're in, lib/session.tsx switches the app to Home.

import { router } from "expo-router";
import { Mail } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";

import ActionButton from "@/components/ActionButton";
import AuthLayout, { Checkbox, EMAIL, Footer, FormMessage, OrDivider, PasswordField, TextLink } from "@/components/AuthLayout";
import TextField from "@/components/TextField";
import { remembers } from "@/lib/authStorage";
import { useSession } from "@/lib/session";
import { sendPasswordReset, signInWithEmail, signInWithGoogle } from "@/lib/supabase";
import { makeStyles } from "@/lib/theme";

type Busy = null | "email" | "google" | "reset";

export default function SignIn() {
  const { notice, clearNotice } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(remembers);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const s = useStyles();

  // Runs one action with its spinner, showing its error (or the good news it returns)
  const run = async (which: Busy, action: () => Promise<string | null | void>) => {
    if (busy) return;
    setBusy(which);
    setError(null);
    setInfo(null);
    clearNotice();
    try {
      const news = await action();
      if (news) setInfo(news);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const signIn = () =>
    run("email", async () => {
      if (!EMAIL.test(email.trim())) throw new Error("Type the email you signed up with.");
      if (!password) throw new Error("Type your password.");
      await signInWithEmail(email, password, remember);
    });

  const forgot = () =>
    run("reset", async () => {
      if (!EMAIL.test(email.trim())) throw new Error("Type your email above first, then tap Forgot password.");
      await sendPasswordReset(email);
      return `We sent a link to ${email.trim()}. Open it on this device to choose a new password.`;
    });

  const google = () =>
    run("google", async () => {
      await signInWithGoogle(remember);
    });

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to keep your garden growing" testID="sign-in-scroll">
      <View style={s.fields}>
        <TextField
          label="Email"
          icon={Mail}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <PasswordField label="Password" value={password} onChangeText={setPassword} placeholder="Your password" onSubmitEditing={signIn} />
      </View>

      <View style={s.row}>
        <Checkbox label="Remember me" checked={remember} onChange={setRemember} />
        <TextLink label="Forgot password?" onPress={forgot} disabled={!!busy} />
      </View>

      <ActionButton label="Sign in" onPress={signIn} busy={busy === "email"} style={s.signIn} />
      <FormMessage text={error ?? notice} tone="error" />
      <FormMessage text={info} tone="info" />

      <OrDivider />
      <ActionButton variant="secondary" label="Google" accessibilityLabel="Continue with Google" onPress={google} busy={busy === "google"} />

      <Footer text="New to Sortify?" link="Create an account" onPress={() => router.push("/sign-up")} />
    </AuthLayout>
  );
}

const useStyles = makeStyles(() => ({
  fields: { gap: 18 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24 },
  signIn: { marginTop: 24, minHeight: 56 },
}));
