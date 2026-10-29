// The row of avatar circles on sign-in and in "Edit profile".

import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Avatar } from "@/lib/api";
import { AVATAR_IDS, AVATARS } from "@/lib/avatars";
import { colors, spacing } from "@/theme";

export default function AvatarPicker({ value, onChange }: { value: Avatar; onChange: (avatar: Avatar) => void }) {
  return (
    <View style={styles.grid}>
      {AVATAR_IDS.map((id) => {
        const selected = id === value;
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
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
  );
}

const SIZE = 52;

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  avatar: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  avatarSelected: { borderColor: colors.primary },
  avatarEmoji: { fontSize: 26 },
});
