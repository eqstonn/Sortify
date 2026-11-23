// The camera: framing guide, torch, Photo/Barcode toggle, gallery button and
// shutter, all as glass over the live picture. Always dark, like a phone's
// camera app. Without camera permission it falls back to picking a photo.

import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { ImageIcon } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ActionButton from "@/components/ActionButton";
import Chips from "@/components/Chips";
import GlassCard, { GlassLayers } from "@/components/GlassCard";
import GlassIconButton from "@/components/GlassIconButton";
import PressableScale from "@/components/PressableScale";
import Screen from "@/components/Screen";
import { api, ApiError } from "@/lib/api";
import { lastScan } from "@/lib/lastScan";
import { makeStyles, useTheme } from "@/lib/theme";
import { fonts, layout, radius, spacing } from "@/theme";

// The backend shrinks photos to 1024 px anyway, so a smaller upload is faster over the tunnel
const PHOTO_QUALITY = 0.5;

type Mode = "photo" | "barcode";

const MODES: { value: Mode; label: string }[] = [
  { value: "photo", label: "Photo" },
  { value: "barcode", label: "Barcode" },
];

export default function Scan() {
  return (
    <>
      <StatusBar style="light" />
      <Camera />
    </>
  );
}

function Camera() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const asked = useRef(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [mode, setMode] = useState<Mode>("photo");
  const [sorting, setSorting] = useState(false);
  const { colors, type } = useTheme();
  const s = useStyles();

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

  const close = <GlassIconButton icon="x" label="Close" onPress={() => router.back()} />;

  // Still finding out whether we have permission
  if (!permission) return <View style={s.screen} />;

  if (!permission.granted) {
    return (
      <Screen edges={["top", "bottom"]} style={s.padded}>
        <View style={s.topBar}>{close}</View>
        <View style={s.fallback}>
          <GlassCard style={s.fallbackCard}>
            <View style={s.fallbackIcon}>
              <Feather name="camera-off" size={28} color={colors.accent} />
            </View>
            <Text style={[type.title, s.centred]}>Camera is off</Text>
            <Text style={[type.body, s.centred]}>Allow camera access to scan items, or choose a photo you already took.</Text>
            <ActionButton label="Choose a photo" icon={ImageIcon} onPress={pickPhoto} disabled={sorting} style={s.stretch} />
            <ActionButton
              variant="glass"
              label="Allow camera"
              // iOS only asks once; after that the switch is in Settings
              onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
              style={s.stretch}
            />
          </GlassCard>
        </View>
        {sorting && <SortingOverlay />}
      </Screen>
    );
  }

  return (
    <View style={s.screen}>
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} onCameraReady={() => setCameraReady(true)} />

      <View style={[s.overlay, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={s.topBar}>
          {close}
          <View style={s.pill}>
            <GlassLayers />
            <Text style={s.pillText}>Ottawa rules</Text>
          </View>
          <GlassIconButton
            icon={torch ? "zap" : "zap-off"}
            label={torch ? "Turn light off" : "Turn light on"}
            onPress={() => setTorch((on) => !on)}
          />
        </View>

        <View style={s.middle}>
          <FramingGuide />
          <View style={s.pill}>
            <GlassLayers />
            <Text style={s.pillText}>
              {mode === "photo" ? "Fit one item inside the frame" : "Barcode lookup is coming soon. Use Photo for now."}
            </Text>
          </View>
        </View>

        <View style={s.bottom}>
          <View style={s.toggle}>
            <Chips options={MODES} value={mode} onChange={setMode} label="Scan mode" />
          </View>

          <View style={s.controls}>
            <GlassIconButton icon="image" label="Choose from gallery" onPress={pickPhoto} disabled={sorting} size={52} />
            <PressableScale
              onPress={takePhoto}
              disabled={!cameraReady || sorting || mode !== "photo"}
              style={[s.shutter, (mode !== "photo" || !cameraReady) && s.dimmed]}
              accessibilityRole="button"
              accessibilityLabel="Take photo"
            >
              <View style={s.shutterInner} />
            </PressableScale>
            <GlassIconButton icon="help-circle" label="How to scan" onPress={showHelp} size={52} />
          </View>
        </View>
      </View>

      {sorting && <SortingOverlay />}
    </View>
  );
}

// Four leaf-green corner brackets
function FramingGuide() {
  const s = useStyles();
  return (
    <View style={s.frame}>
      <View style={[s.corner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: radius.card }]} />
      <View style={[s.corner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: radius.card }]} />
      <View style={[s.corner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: radius.card }]} />
      <View style={[s.corner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: radius.card }]} />
    </View>
  );
}

function SortingOverlay() {
  const { colors } = useTheme();
  const s = useStyles();
  return (
    <View style={s.sorting}>
      <GlassLayers strong />
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={s.sortingText}>Sorting it out…</Text>
    </View>
  );
}

const FRAME = 260;
const SHUTTER = 80;

const useStyles = makeStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  padded: { paddingHorizontal: layout.gutter, paddingTop: spacing.sm },
  overlay: {
    flex: 1,
    width: "100%",
    maxWidth: layout.maxContent,
    alignSelf: "center",
    paddingHorizontal: layout.gutter,
    justifyContent: "space-between",
  },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: "hidden",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pillText: { fontFamily: fonts.bold, fontSize: 13, color: colors.text, textAlign: "center" },
  middle: { alignItems: "center", gap: spacing.xl },
  frame: { width: FRAME, height: FRAME },
  corner: { position: "absolute", width: 48, height: 48, borderColor: colors.accent },
  bottom: { alignItems: "center", gap: spacing.xl },
  toggle: { width: 220 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", alignSelf: "stretch" },
  shutter: {
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: SHUTTER / 2,
    borderWidth: 5,
    borderColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: { width: SHUTTER - 18, height: SHUTTER - 18, borderRadius: (SHUTTER - 18) / 2, backgroundColor: colors.accent },
  dimmed: { opacity: 0.5 },

  fallback: { flex: 1, justifyContent: "center" },
  fallbackCard: { padding: spacing.xl, alignItems: "center" },
  fallbackIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  centred: { textAlign: "center" },
  stretch: { alignSelf: "stretch" },

  sorting: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", gap: spacing.md },
  sortingText: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
}));
