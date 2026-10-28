// "Not right?": a searchable list of every category, so the player can say what it really was.

import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { binLabel } from "@/components/BinCard";
import { api, ApiError, type Category } from "@/lib/api";
import { binColors, colors, fonts, radius, spacing, type } from "@/theme";

type Props = {
  visible: boolean;
  onPick: (categoryId: string) => void;
  onClose: () => void;
};

export default function CategoryPicker({ visible, onPick, onClose }: Props) {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!visible || categories) return;
    api
      .categories()
      .then(setCategories)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't load the list. Try again."));
  }, [visible, categories]);

  const query = search.trim().toLowerCase();
  const shown = (categories ?? []).filter(
    (c) => !query || c.name.toLowerCase().includes(query) || c.examples.some((e) => e.toLowerCase().includes(query)),
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Text style={type.heading}>What is it really?</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
            <Feather name="x" size={24} color={colors.text} />
          </Pressable>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search, e.g. pizza box"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          autoCorrect={false}
        />

        {error ? (
          <Text style={[type.body, styles.message]}>{error}</Text>
        ) : !categories ? (
          <ActivityIndicator color={colors.primary} style={styles.message} />
        ) : (
          <FlatList
            data={shown}
            keyExtractor={(c) => c.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onPick(item.id)}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={item.name}
              >
                <View style={[styles.dot, { backgroundColor: binColors[item.bin] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={type.body}>{item.name}</Text>
                  <Text style={type.caption}>{binLabel(item.bin)}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.xl,
    paddingBottom: spacing.md,
  },
  search: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  message: { margin: spacing.xl },
  list: { padding: spacing.xl, gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
});
