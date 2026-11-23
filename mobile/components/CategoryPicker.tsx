// "Not right?": a searchable list of every category, so the player can say what it really was.

import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Text, TextInput, View } from "react-native";

import { binLabel } from "@/components/BinCard";
import { GlassLayers } from "@/components/GlassCard";
import GlassIconButton from "@/components/GlassIconButton";
import PressableScale from "@/components/PressableScale";
import Screen from "@/components/Screen";
import { api, ApiError, type Category } from "@/lib/api";
import { makeStyles, useTheme } from "@/lib/theme";
import { binColors, fonts, layout, radius, spacing } from "@/theme";

type Props = {
  visible: boolean;
  onPick: (categoryId: string) => void;
  onClose: () => void;
};

export default function CategoryPicker({ visible, onPick, onClose }: Props) {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { colors, type } = useTheme();
  const s = useStyles();

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
      <Screen edges={["top", "bottom"]}>
        <View style={s.header}>
          <Text style={type.title}>What is it really?</Text>
          <GlassIconButton icon="x" label="Close" onPress={onClose} />
        </View>

        <View style={s.search}>
          <Feather name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search, e.g. pizza box"
            placeholderTextColor={colors.textFaint}
            style={s.input}
            autoCorrect={false}
          />
        </View>

        {error ? (
          <Text style={[type.body, s.message]}>{error}</Text>
        ) : !categories ? (
          <ActivityIndicator color={colors.accent} style={s.message} />
        ) : (
          <FlatList
            data={shown}
            keyExtractor={(c) => c.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.list}
            renderItem={({ item }) => (
              <PressableScale onPress={() => onPick(item.id)} style={s.row} accessibilityRole="button" accessibilityLabel={item.name}>
                <GlassLayers />
                <View style={[s.dot, { backgroundColor: binColors[item.bin] }]} />
                <View style={s.rowText}>
                  <Text style={type.body}>{item.name}</Text>
                  <Text style={type.caption}>{binLabel(item.bin)}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
              </PressableScale>
            )}
          />
        )}
      </Screen>
    </Modal>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: layout.gutter,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
    backgroundColor: colors.glassInner,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  input: { flex: 1, paddingVertical: spacing.md, fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  message: { margin: layout.gutter },
  list: { padding: layout.gutter, gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: "hidden",
    padding: spacing.md,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  rowText: { flex: 1 },
}));
