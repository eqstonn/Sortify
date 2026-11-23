// A cream panel that slides up from the bottom over a dimmed screen, for small
// forms and details (pickup day, edit profile, a Discover item).
// For the panel that's part of a page (Home, Board), see SheetPanel.

import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SheetPanel from "@/components/SheetPanel";
import { makeStyles, useTheme } from "@/lib/theme";
import { layout, spacing } from "@/theme";

type Props = { visible: boolean; title: string; onClose: () => void; children: ReactNode };

export default function Sheet({ visible, title, onClose, children }: Props) {
  const insets = useSafeAreaInsets();
  const { type } = useTheme();
  const s = useStyles();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <SheetPanel style={[s.sheet, { paddingBottom: spacing.xl + insets.bottom }]}>
          <ScrollView contentContainerStyle={s.content} bounces={false} keyboardShouldPersistTaps="handled">
            <Text style={type.heading}>{title}</Text>
            {children}
          </ScrollView>
        </SheetPanel>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  fill: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  sheet: { width: "100%", maxWidth: layout.maxContent, maxHeight: "85%" },
  content: { gap: spacing.md },
}));
