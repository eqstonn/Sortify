// Me's edit button: your profile photo and your name.
// - Photo: pick one from the phone (cropped square on the phone), and it's
//   uploaded straight away (POST /me/avatar). The backend shrinks it and
//   removes its location data before saving it. "Remove photo" goes back to
//   the default picture.
// - Name: saved with the Save button (PATCH /me).

import * as ImagePicker from "expo-image-picker";
import { ImageIcon } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import ActionButton from "@/components/ActionButton";
import Avatar, { avatarUri } from "@/components/Avatar";
import Sheet from "@/components/Sheet";
import TextField from "@/components/TextField";
import { api, type ProfileOut } from "@/lib/api";
import { makeStyles, useTheme } from "@/lib/theme";
import { errorText } from "@/lib/useLoad";
import { chunky, fonts, spacing } from "@/theme";

const MAX_NAME = 30; // same limit as ProfileUpdate in app/schemas.py

type Props = {
  visible: boolean;
  profile: ProfileOut;
  onClose: () => void;
  onSaved: (profile: ProfileOut) => void; // name saved: the sheet closes
  onPhoto: (profile: ProfileOut) => void; // photo changed: the page updates, the sheet stays open
};

export default function EditProfileSheet({ visible, profile, onClose, onSaved, onPhoto }: Props) {
  return (
    <Sheet visible={visible} title="Edit profile" onClose={onClose}>
      {/* Mounted on open, so the form starts from what's saved each time */}
      {visible ? <ProfileForm profile={profile} onSaved={onSaved} onPhoto={onPhoto} /> : null}
    </Sheet>
  );
}

function ProfileForm({ profile, onSaved, onPhoto }: Pick<Props, "profile" | "onSaved" | "onPhoto">) {
  const [name, setName] = useState(profile.name);
  const [photo, setPhoto] = useState(avatarUri(profile.avatar));
  const [busy, setBusy] = useState<null | "name" | "photo">(null);
  const [error, setError] = useState<string | null>(null);
  const { colors } = useTheme();
  const s = useStyles();

  const ready = name.trim().length > 0 && !busy;

  const save = async () => {
    if (!ready) return;
    setBusy("name");
    setError(null);
    try {
      onSaved(await api.updateMe({ name: name.trim() }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const changePhoto = async (change: () => Promise<ProfileOut | null>) => {
    if (busy) return;
    setBusy("photo");
    setError(null);
    try {
      const saved = await change();
      if (saved) {
        setPhoto(avatarUri(saved.avatar));
        onPhoto(saved);
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const choose = () =>
    changePhoto(async () => {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true, // the phone's crop screen
        aspect: [1, 1],
        quality: 0.8,
        exif: false,
      });
      if (picked.canceled || !picked.assets[0]) return null;
      return api.uploadAvatar(picked.assets[0].uri);
    });

  return (
    <>
      <View style={s.photoRow}>
        <View>
          <Avatar uri={photo} size={84} ring ringWidth={2} depth={chunky.band} />
          {busy === "photo" ? (
            <View style={s.photoBusy}>
              <ActivityIndicator color={colors.onForest} />
            </View>
          ) : null}
        </View>
        <View style={s.photoActions}>
          <ActionButton variant="secondary" icon={ImageIcon} label={photo ? "Change photo" : "Add a photo"} onPress={choose} disabled={!!busy} />
          {photo ? (
            <Pressable onPress={() => changePhoto(api.removeAvatar)} disabled={!!busy} accessibilityRole="button" hitSlop={8}>
              <Text style={s.remove}>Remove photo</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        maxLength={MAX_NAME}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={save}
        accessibilityLabel="Your name"
      />
      {error ? <Text style={s.error}>{error}</Text> : null}
      <ActionButton label="Save" onPress={save} busy={busy === "name"} disabled={!ready && busy !== "name"} style={s.save} />
    </>
  );
}

const useStyles = makeStyles(({ colors, type }) => ({
  photoRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginBottom: spacing.sm },
  photoBusy: { position: "absolute", top: 0, left: 0, width: 84, height: 84, borderRadius: 42, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center" },
  photoActions: { flex: 1, gap: spacing.md, alignItems: "flex-start" },
  remove: { fontFamily: fonts.semibold, fontSize: 15, color: colors.terracotta, textDecorationLine: "underline" },
  error: { ...type.body, color: colors.danger },
  save: { marginTop: spacing.sm },
}));
