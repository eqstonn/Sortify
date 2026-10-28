// The camera from 04-camera.png: framing guide, torch, Photo/Barcode toggle,
// gallery button and shutter. Without camera permission it falls back to
// picking a photo from the gallery.

import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, ApiError } from "@/lib/api";
import { lastScan } from "@/lib/lastScan";
import { colors, fonts, radius, spacing } from "@/theme";

// The backend shrinks photos to 1024 px anyway, so a smaller upload is faster over ngrok
const PHOTO_QUALITY = 0.5;

type Mode = "photo" | "barcode";

export default function Scan() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const asked = useRef(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [mode, setMode] = useState<Mode>("photo");
  const [sorting, setSorting] = useState(false);

  // Ask once when the screen opens; after a "Don't allow" we show the gallery fallback
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && !asked.current) {
      asked.current = true;
      requestPermission();
    }
  }, [permission, requestPermission]);

  const sort = async (photoUri: string) => {
    setSorting(true);
    try {
      const result = await api.classify(photoUri);
      lastScan.set({ photoUri, result });
      router.replace("/result");
    } catch (e) {
      setSorting(false);
      Alert.alert("Couldn't sort that", e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    }
  };

  const takePhoto = async () => {
    if (!camera.current || !cameraReady || sorting) return;
    const photo = await camera.current.takePictureAsync({ quality: PHOTO_QUALITY });
    if (photo?.uri) await sort(photo.uri);
  };

  const pickPhoto = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: PHOTO_QUALITY });
    if (!picked.canceled && picked.assets[0]) await sort(picked.assets[0].uri);
  };

  const showHelp = () =>
    Alert.alert(
      "How to scan",
      "Put one item in the frame, in good light, with the label showing if it has one. We'll tell you which Ottawa bin it goes in.",
    );

  const close = (
    <RoundButton icon="x" label="Close" onPress={() => router.back()} />
  );

  // Still finding out whether we have permission
  if (!permission) return <View style={styles.screen} />;

  if (!permission.granted) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.topBar}>{close}</View>
        <View style={styles.fallback}>
          <View style={styles.fallbackIcon}>
            <Feather name="camera-off" size={30} color={colors.onPrimary} />
          </View>
          <Text style={styles.fallbackTitle}>Camera is off</Text>
          <Text style={styles.fallbackText}>
            Allow camera access to scan items, or choose a photo you already took.
          </Text>
          <Pressable
            onPress={pickPhoto}
            disabled={sorting}
            style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Feather name="image" size={18} color={colors.onPrimary} />
            <Text style={styles.primaryButtonText}>Choose a photo</Text>
          </Pressable>
          <Pressable
            // iOS only asks once; after that the switch is in Settings
            onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={styles.linkText}>Allow camera</Text>
          </Pressable>
        </View>
        {sorting && <SortingOverlay />}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView
        ref={camera}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        onCameraReady={() => setCameraReady(true)}
      />

      <View style={[styles.overlay, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.topBar}>
          {close}
          <View style={styles.pill}>
            <Text style={styles.pillText}>Ottawa rules</Text>
          </View>
          <RoundButton
            icon={torch ? "zap" : "zap-off"}
            label={torch ? "Turn light off" : "Turn light on"}
            onPress={() => setTorch((on) => !on)}
          />
        </View>

        <View style={styles.middle}>
          <FramingGuide />
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              {mode === "photo" ? "Fit one item inside the frame" : "Barcode lookup is coming soon. Use Photo for now."}
            </Text>
          </View>
        </View>

        <View style={styles.bottom}>
          <View style={styles.toggle}>
            {(["photo", "barcode"] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={[styles.toggleOption, mode === m && styles.toggleSelected]}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === m }}
              >
                <Text style={[styles.toggleText, mode === m && styles.toggleTextSelected]}>
                  {m === "photo" ? "Photo" : "Barcode"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.controls}>
            <Pressable
              onPress={pickPhoto}
              disabled={sorting}
              style={styles.gallery}
              accessibilityRole="button"
              accessibilityLabel="Choose from gallery"
            >
              <Feather name="image" size={20} color={colors.onPrimary} />
            </Pressable>
            <Pressable
              onPress={takePhoto}
              disabled={!cameraReady || sorting || mode !== "photo"}
              style={({ pressed }) => [styles.shutter, (mode !== "photo" || !cameraReady) && { opacity: 0.5 }, pressed && { transform: [{ scale: 0.95 }] }]}
              accessibilityRole="button"
              accessibilityLabel="Take photo"
            >
              <View style={styles.shutterInner} />
            </Pressable>
            <RoundButton icon="help-circle" label="How to scan" onPress={showHelp} />
          </View>
        </View>
      </View>

      {sorting && <SortingOverlay />}
    </View>
  );
}

function RoundButton({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.round} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}>
      <Feather name={icon} size={20} color={colors.onPrimary} />
    </Pressable>
  );
}

// Four mint corner brackets
function FramingGuide() {
  return (
    <View style={styles.frame} pointerEvents="none">
      <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 18 }]} />
      <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 18 }]} />
      <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 18 }]} />
      <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 18 }]} />
    </View>
  );
}

function SortingOverlay() {
  return (
    <View style={styles.sorting}>
      <ActivityIndicator size="large" color={colors.onPrimary} />
      <Text style={styles.sortingText}>Sorting it out…</Text>
    </View>
  );
}

const FRAME = 260;
const GUIDE = "#A8D5B0"; // mint brackets in the mockup
const GLASS = "rgba(20, 30, 24, 0.6)"; // dark see-through buttons and pills

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cameraBg },
  overlay: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: "space-between" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 0 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: GLASS, alignItems: "center", justifyContent: "center" },
  pill: { backgroundColor: GLASS, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  pillText: { fontFamily: fonts.bold, fontSize: 13, color: colors.onPrimary, textAlign: "center" },
  middle: { alignItems: "center", gap: spacing.xl },
  frame: { width: FRAME, height: FRAME },
  corner: { position: "absolute", width: 44, height: 44, borderColor: GUIDE },
  bottom: { alignItems: "center", gap: spacing.xl },
  toggle: { flexDirection: "row", backgroundColor: GLASS, borderRadius: radius.sm, padding: 4 },
  toggleOption: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.sm - 2 },
  toggleSelected: { backgroundColor: colors.card },
  toggleText: { fontFamily: fonts.bold, fontSize: 13, color: colors.onPrimary },
  toggleTextSelected: { color: colors.text },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", alignSelf: "stretch" },
  gallery: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: GUIDE,
    backgroundColor: GLASS,
    alignItems: "center",
    justifyContent: "center",
  },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.primary },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, gap: spacing.md },
  fallbackIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: GLASS,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  fallbackTitle: { fontFamily: fonts.extrabold, fontSize: 24, color: colors.onPrimary },
  fallbackText: { fontFamily: fonts.medium, fontSize: 15, color: colors.onPrimary, opacity: 0.8, textAlign: "center" },
  primaryButton: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  primaryButtonText: { fontFamily: fonts.bold, fontSize: 16, color: colors.onPrimary },
  linkText: { fontFamily: fonts.bold, fontSize: 15, color: GUIDE, padding: spacing.sm },
  sorting: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(11, 19, 14, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  sortingText: { fontFamily: fonts.bold, fontSize: 17, color: colors.onPrimary },
});
