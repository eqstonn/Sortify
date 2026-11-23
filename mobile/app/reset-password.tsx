// Opened from a "reset your password" email: choose a new password, then
// you're in. lib/session.tsx only shows this screen while that link is open.

import { useState } from "react";
import { View } from "react-native";

import ActionButton from "@/components/ActionButton";
import AuthLayout, { FormMessage, PasswordField } from "@/components/AuthLayout";
import { useSession } from "@/lib/session";
import { setNewPassword } from "@/lib/supabase";
import { makeStyles } from "@/lib/theme";

const MIN_PASSWORD = 6;

export default function ResetPassword() {
  const { finishRecovery, signOut } = useSession();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = useStyles();

  const save = async () => {
    if (busy) return;
    if (password.length < MIN_PASSWORD) {
      setError(`Your password needs at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setNewPassword(password);
      finishRecovery();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="New password" subtitle="Choose a new password for Sortify">
      <View>
        <PasswordField
          label="New password"
          value={password}
          onChangeText={setPassword}
          placeholder={`At least ${MIN_PASSWORD} characters`}
          isNew
          onSubmitEditing={save}
        />
      </View>
      <ActionButton label="Save and sign in" onPress={save} busy={busy} style={s.save} />
      <FormMessage text={error} tone="error" />
      <ActionButton variant="secondary" label="Cancel" onPress={signOut} style={s.cancel} />
    </AuthLayout>
  );
}

const useStyles = makeStyles(() => ({
  save: { marginTop: 26, minHeight: 56 },
  cancel: { marginTop: 14 },
}));
