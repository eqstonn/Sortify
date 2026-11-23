// Create an account: name, email, password, or Google (same look as sign-in).
// The name goes to Supabase with the account, and the new profile takes it
// (supabase/migrations/005_auth.sql). If the Supabase project asks people to
// confirm their email, we say so; otherwise you're straight into the app.

import { router } from "expo-router";
import { Mail, User } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";

import ActionButton from "@/components/ActionButton";
import AuthLayout, { EMAIL, Footer, FormMessage, OrDivider, PasswordField } from "@/components/AuthLayout";
import TextField from "@/components/TextField";
import { signInWithGoogle, signUpWithEmail } from "@/lib/supabase";
import { makeStyles } from "@/lib/theme";

const MAX_NAME = 30; // the profiles.name limit
const MIN_PASSWORD = 6; // Supabase's default minimum

type Busy = null | "email" | "google";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const s = useStyles();

  const run = async (which: Busy, action: () => Promise<string | null | void>) => {
    if (busy) return;
    setBusy(which);
    setError(null);
    setInfo(null);
    try {
      const news = await action();
      if (news) setInfo(news);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const create = () =>
    run("email", async () => {
      if (!name.trim()) throw new Error("Type your name: it's what the leaderboard shows.");
      if (!EMAIL.test(email.trim())) throw new Error("Type your email address.");
      if (password.length < MIN_PASSWORD) throw new Error(`Your password needs at least ${MIN_PASSWORD} characters.`);
      const signedIn = await signUpWithEmail(name, email, password);
      if (!signedIn) return `Almost there! Open the link we sent to ${email.trim()}, then sign in.`;
    });

  const back = () => (router.canGoBack() ? router.back() : router.replace("/sign-in"));

  return (
    <AuthLayout title="Start your garden" subtitle="Create an account to save your points" testID="sign-up-scroll">
      <View style={s.fields}>
        <TextField
          label="Name"
          icon={User}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          maxLength={MAX_NAME}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
        />
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
        <PasswordField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder={`At least ${MIN_PASSWORD} characters`}
          isNew
          onSubmitEditing={create}
        />
      </View>

      <ActionButton label="Create account" onPress={create} busy={busy === "email"} style={s.create} />
      <FormMessage text={error} tone="error" />
      <FormMessage text={info} tone="info" />

      <OrDivider />
      <ActionButton
        variant="secondary"
        label="Google"
        accessibilityLabel="Continue with Google"
        onPress={() => run("google", async () => void (await signInWithGoogle(true)))}
        busy={busy === "google"}
      />

      <Footer text="Already have an account?" link="Sign in" onPress={back} />
    </AuthLayout>
  );
}

const useStyles = makeStyles(() => ({
  fields: { gap: 18 },
  create: { marginTop: 26, minHeight: 56 },
}));
