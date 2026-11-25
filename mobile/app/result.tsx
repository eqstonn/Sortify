// The scan result: what it is, which bin (BinCard in the bin's colour), prep
// steps, then I recycled it / Skip / Not right?. Drop-off items also get the
// nearest drop-off site with Google Maps directions (DropoffCard). When Gemini isn't sure, the
// player picks the right category first (needs_review). Points come from the
// backend on confirm; the app never works them out.

import { router } from "expo-router";
import { CameraIcon, House } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, Text, View } from "react-native";

import ActionButton from "@/components/ActionButton";
import BinCard from "@/components/BinCard";
import CategoryPicker from "@/components/CategoryPicker";
import CheckedOnline from "@/components/CheckedOnline";
import DropoffCard from "@/components/DropoffCard";
import GlassCard, { GlassLayers } from "@/components/GlassCard";
import GlassIconButton from "@/components/GlassIconButton";
import PressableScale from "@/components/PressableScale";
import Screen from "@/components/Screen";
import { api, ApiError, type Bin, type ClassifyResult, isOtherCategory, type NextPickup, SOMETHING_ELSE } from "@/lib/api";
import { type DropoffState, useNearestDropoff } from "@/lib/dropoff";
import { lastScan } from "@/lib/lastScan";
import { showPointsToast } from "@/lib/pointsToast";
import { makeStyles, useTheme } from "@/lib/theme";
import { binColors, fonts, layout, radius, spacing } from "@/theme";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-27" → "Tue, Oct 27" */
function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d); // local date, so the day doesn't shift with the time zone
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${d}`;
}

/** The line under the bin name: when it goes out, or where to take it. */
function binDetail(result: ClassifyResult, pickup: NextPickup | null, dropoff: DropoffState): string | undefined {
  if (result.bin === "dropoff") {
    return dropoff.state === "found"
      ? `${dropoff.nearest.site.name} · ${dropoff.nearest.distance_km.toFixed(1)} km`
      : "Not curbside: take it to a drop-off";
  }
  if (result.bin === "unsure") return 'Tap "Not right?" and pick what it is';
  const curbside: Bin[] = ["blue_bin", "black_bin", "green_bin"];
  if (!pickup || !curbside.includes(result.bin)) return undefined;
  // Blue and black take turns, so a bin missing from the next pickup goes out the week after
  return pickup.bins.includes(result.bin)
    ? `Next pickup ${shortDate(pickup.pickup_date)}`
    : `Not ${shortDate(pickup.pickup_date)}, the week after`;
}

function badgeFor(result: ClassifyResult): { text: string; good: boolean } {
  if (result.recyclable) return { text: "Recyclable", good: true };
  if (result.bin === "dropoff") return { text: "Special drop-off", good: false };
  if (result.bin === "unsure") return { text: "Not sure", good: false };
  return { text: "Not recyclable", good: false };
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export default function Result() {
  const scan = lastScan.get();
  const [result, setResult] = useState<ClassifyResult | null>(scan?.result ?? null);
  const [pickup, setPickup] = useState<NextPickup | null>(null);
  const [busy, setBusy] = useState<"confirm" | "correct" | null>(null);
  const [picking, setPicking] = useState(false);
  // Drop-off items: find the nearest site from the phone's location (asks permission the first time)
  const dropoff = useNearestDropoff(result?.bin === "dropoff", result?.dropoff_type ?? null);
  const { colors, type } = useTheme();
  const s = useStyles();

  useEffect(() => {
    // Only for the "Next pickup" line, so a failure just leaves it out
    api.nextPickup().then(setPickup).catch(() => {});
  }, []);

  if (!scan || !result) {
    // Opened without a scan (e.g. a web refresh): nothing to show
    return (
      <Screen style={s.emptyScreen}>
        <GlassCard style={s.emptyCard}>
          <Text style={type.heading}>No scan yet</Text>
          <ActionButton label="Scan an item" icon={CameraIcon} onPress={() => router.replace("/scan")} />
        </GlassCard>
      </Screen>
    );
  }

  const scanId = result.scan_id;
  // An "unsure" scan has no bin to confirm; the backend refuses it until it's corrected
  const canConfirm = !!scanId && result.bin !== "unsure" && !result.needs_review && !busy;
  const badge = badgeFor(result);

  const confirm = async () => {
    if (!scanId || !canConfirm) return;
    setBusy("confirm");
    try {
      const res = await api.confirmScan(scanId);
      showPointsToast({ points: res.points_awarded, total: res.total_points, notes: res.notes });
      router.dismissTo("/"); // Home shows the toast
    } catch (e) {
      setBusy(null);
      Alert.alert("Couldn't save that", e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    }
  };

  const correct = async (categoryId: string) => {
    setPicking(false);
    if (!scanId) return;
    setBusy("correct");
    try {
      setResult(await api.correctScan(scanId, { category_id: categoryId }));
    } catch (e) {
      Alert.alert("Couldn't change it", e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <View style={s.header}>
        <GlassIconButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        <Text style={type.heading}>Scan result</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <GlassCard style={s.itemCard}>
          <View style={s.photoBox}>
            <Image source={{ uri: scan.photoUri }} style={s.photo} accessibilityIgnoresInvertColors />
          </View>
          <View style={s.itemText}>
            <View style={[s.badge, !badge.good && s.badgeMuted]}>
              {badge.good && <Text style={s.badgeText}>✓</Text>}
              <Text style={[s.badgeText, !badge.good && s.badgeTextMuted]}>{badge.text}</Text>
            </View>
            <Text style={s.itemName}>{result.name}</Text>
            <Text style={type.caption}>
              {result.checked_online
                ? "Not in our list · checked online"
                : result.category_id === "unknown"
                  ? "Not in our list" // its confidence is about "nothing fits", so a % would only confuse
                  : `${capitalize(result.material)} · ${Math.round(result.confidence * 100)}% sure`}
            </Text>
          </View>
        </GlassCard>

        {busy === "correct" ? (
          <GlassCard style={s.centred}>
            <ActivityIndicator color={colors.accent} />
          </GlassCard>
        ) : (
          <BinCard bin={result.bin} detail={binDetail(result, pickup, dropoff)} />
        )}

        {/* New in 2026 (chip bags, foam, cups...): only the blue bin at home takes them */}
        {result.home_only && busy !== "correct" ? (
          <GlassCard testID="home-only">
            <View style={s.noteHeading}>
              <House size={18} color={colors.text} strokeWidth={2} />
              <Text style={type.heading}>Home blue bin only</Text>
            </View>
            <Text style={type.body}>
              Your blue bin at home takes this since 2026. Away from home (school, work, public bins), put it in the garbage.
            </Text>
          </GlassCard>
        ) : null}

        {result.needs_review && (
          <GlassCard style={s.reviewCard}>
            <Text style={type.heading}>{"We're not sure. Which item is it?"}</Text>
            <Text style={type.caption}>Choose the correct category before earning points.</Text>
            {result.alternatives.map((choice) => (
              <PressableScale
                key={choice.category_id}
                onPress={() => correct(choice.category_id)}
                disabled={!!busy}
                accessibilityRole="button"
                accessibilityLabel={`Choose ${choice.name}`}
                style={s.choice}
              >
                <View style={[s.binDot, { backgroundColor: binColors[choice.bin] }]} />
                <Text style={s.choiceText}>{choice.name}</Text>
              </PressableScale>
            ))}
            <PressableScale
              onPress={() => correct(SOMETHING_ELSE)}
              disabled={!!busy}
              accessibilityRole="button"
              accessibilityLabel="Something else (not recyclable)"
              style={s.choice}
            >
              <View style={[s.binDot, { backgroundColor: binColors.garbage }]} />
              <Text style={s.choiceText}>Something else (not recyclable)</Text>
            </PressableScale>
            <PressableScale
              onPress={() => setPicking(true)}
              disabled={!!busy}
              accessibilityRole="button"
              accessibilityLabel="Choose another category"
              style={s.choice}
            >
              <Text style={[s.choiceText, s.choiceOther]}>See all categories</Text>
            </PressableScale>
          </GlassCard>
        )}

        {result.bin === "dropoff" && busy !== "correct" ? <DropoffCard type={result.dropoff_type} lookup={dropoff} /> : null}

        {/* Not in our list: what the online lookup found, or the City's Waste Explorer */}
        {(isOtherCategory(result.category_id) || result.category_id === "unknown") && busy !== "correct" ? (
          <CheckedOnline check={result.checked_online} />
        ) : null}

        {/* A looked-up item's only tip is the lookup's summary, already shown above */}
        {result.tips.length > 0 && !result.checked_online && (
          <GlassCard>
            <Text style={type.heading}>Before it goes in</Text>
            {result.tips.map((tip, i) => (
              <View key={tip} style={s.step}>
                <View style={s.stepNumber}>
                  <Text style={s.stepNumberText}>{i + 1}</Text>
                </View>
                <Text style={[type.body, s.stepText]}>{tip}</Text>
              </View>
            ))}
          </GlassCard>
        )}
      </ScrollView>

      <View style={s.actions}>
        <GlassLayers strong />
        <ActionButton
          label="I recycled it"
          onPress={confirm}
          busy={busy === "confirm"}
          disabled={!canConfirm && busy !== "confirm"}
        >
          <View style={s.pointsChip}>
            <Text style={s.pointsChipText}>+{result.points} pts</Text>
          </View>
        </ActionButton>
        <View style={s.secondaryRow}>
          <ActionButton variant="glass" label="Skip" onPress={() => router.back()} disabled={!!busy} style={s.secondary} />
          <ActionButton variant="glass" label="Not right?" onPress={() => setPicking(true)} disabled={!!busy || !scanId} style={s.secondary} />
        </View>
      </View>

      <CategoryPicker visible={picking} onPick={correct} onClose={() => setPicking(false)} />
    </Screen>
  );
}

const PHOTO = 96;

const useStyles = makeStyles(({ colors }) => ({
  emptyScreen: { justifyContent: "center", padding: layout.gutter },
  emptyCard: { padding: spacing.xl, alignItems: "center" },

  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: layout.gutter, paddingVertical: spacing.md },
  content: { paddingHorizontal: layout.gutter, paddingBottom: spacing.lg, gap: spacing.md },

  itemCard: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  photoBox: { width: PHOTO, height: PHOTO, borderRadius: radius.inner, backgroundColor: colors.glassInner, overflow: "hidden" },
  photo: { width: "100%", height: "100%" },
  itemText: { flex: 1, gap: spacing.xs, alignItems: "flex-start" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  badgeMuted: { backgroundColor: colors.glassInner, borderWidth: 1, borderColor: colors.glassBorder },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, color: colors.onAccent },
  badgeTextMuted: { color: colors.textMuted },
  itemName: { fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 27, color: colors.text },

  centred: { alignItems: "center", justifyContent: "center", minHeight: 96 },
  noteHeading: { flexDirection: "row", alignItems: "center", gap: spacing.sm },

  reviewCard: { borderColor: colors.gold },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.inner,
    backgroundColor: colors.glassInner,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  binDot: { width: 12, height: 12, borderRadius: 6 },
  choiceText: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  choiceOther: { color: colors.accent },

  step: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  stepNumberText: { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },
  stepText: { flex: 1 },

  // The bottom bar: 20 px buttons inside 8 px padding make its 28 px corners
  actions: {
    marginHorizontal: layout.gutter,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    gap: spacing.sm,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: "hidden",
  },
  pointsChip: { borderWidth: 1, borderColor: colors.onAccent, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  pointsChipText: { fontFamily: fonts.bold, fontSize: 13, color: colors.onAccent },
  secondaryRow: { flexDirection: "row", gap: spacing.sm },
  secondary: { flex: 1 },
}));
