// Me's edit button: change your name and avatar (PATCH /me).

import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput } from "react-native";

import AvatarPicker from "@/components/AvatarPicker";
import Sheet from "@/components/Sheet";
import { api, type Avatar, type ProfileOut } from "@/lib/api";
import { AVATARS } from "@/lib/avatars";
import { errorText } from "@/lib/useLoad";
import { colors, fonts, radius, spacing, type } from "@/theme";

const MAX_NAME = 30; // same limit as ProfileUpdate in app/schemas.py

type Props = { visible: boolean; profile: ProfileOut; onClose: () => void; onSaved: (profile: ProfileOut) => void };

export default function EditProfileSheet({ visible, profile, onClose, onSaved }: Props) {
  return (
    <Sheet visible={visible} title="Edit profile" onClose={onClose}>
      {/* Mounted on open, so the form starts from what's saved each time */}
      {visible ? <ProfileForm profile={profile} onSaved={onSaved} /> : null}
    </Sheet>
  );
}

function ProfileForm({ profile, onSaved }: Pick<Props, "profile" | "onSaved">) {
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState<Avatar>(profile.avatar in AVATARS ? (profile.avatar as Avatar) : "sprout");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = name.trim().length > 0 && !busy;

  const save = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      onSaved(await api.updateMe({ name: name.trim(), avatar }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Text style={type.label}>NAME</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        maxLength={MAX_NAME}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={save}
        style={styles.input}
        accessibilityLabel="Your name"
      />
      <Text style={type.label}>AVATAR</Text>
      <AvatarPicker value={avatar} onChange={setAvatar} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        onPress={save}
        disabled={!ready}
        style={({ pressed }) => [styles.save, !ready && { opacity: 0.45 }, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !ready }}
      >
        {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.saveText}>Save</Text>}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  input: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text, backgroundColor: colors.card, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  error: { ...type.body, color: colors.danger },
  save: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center", marginTop: spacing.sm },
  saveText: { fontFamily: fonts.bold, fontSize: 16, color: colors.onPrimary },
});
