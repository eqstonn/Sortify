// The scan result from 05-scan-result.png: what it is, which bin (BinCard in
// the bin's colour), prep steps, then I recycled it / Skip / Not right?.
// Points come from the backend on confirm; the app never works them out.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BinCard from "@/components/BinCard";
import CategoryPicker from "@/components/CategoryPicker";
import { api, ApiError, type Bin, type ClassifyResult, type NextPickup } from "@/lib/api";
import { lastScan } from "@/lib/lastScan";
import { showPointsToast } from "@/lib/pointsToast";
import { colors, fonts, radius, spacing, type } from "@/theme";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-27" → "Tue, Oct 27" */
function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d); // local date, so the day doesn't shift with the time zone
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${d}`;
}

/** The line under the bin name: when it goes out, or where to take it. */
function binDetail(result: ClassifyResult, pickup: NextPickup | null): string | undefined {
  if (result.bin === "dropoff") {
    const nearest = result.nearest_dropoff;
    return nearest ? `${nearest.site.name} · ${nearest.distance_km.toFixed(1)} km` : "Not curbside: see the city's drop-off sites";
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

  useEffect(() => {
    // Only for the "Next pickup" line, so a failure just leaves it out
    api.nextPickup().then(setPickup).catch(() => {});
  }, []);

  if (!scan || !result) {
    // Opened without a scan (e.g. a web refresh): nothing to show
    return (
      <SafeAreaView style={[styles.screen, styles.empty]}>
        <Text style={type.heading}>No scan yet</Text>
        <Pressable onPress={() => router.replace("/scan")} accessibilityRole="button">
          <Text style={[type.heading, { color: colors.primary }]}>Scan an item</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const scanId = result.scan_id;
  // An "unsure" scan has no bin to confirm; the backend refuses it until it's corrected
  const canConfirm = !!scanId && result.bin !== "unsure" && !busy;
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
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={type.heading}>Scan result</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, styles.itemCard]}>
          <View style={styles.photoBox}>
            <Image source={{ uri: scan.photoUri }} style={styles.photo} accessibilityIgnoresInvertColors />
          </View>
          <View style={styles.itemText}>
            <View style={[styles.badge, !badge.good && styles.badgeMuted]}>
              {badge.good && <Feather name="check" size={12} color={colors.onPrimary} />}
              <Text style={[styles.badgeText, !badge.good && styles.badgeTextMuted]}>{badge.text}</Text>
            </View>
            <Text style={styles.itemName}>{result.name}</Text>
            <Text style={type.caption}>
              {capitalize(result.material)} · {Math.round(result.confidence * 100)}% sure
            </Text>
          </View>
        </View>

        {busy === "correct" ? (
          <View style={[styles.card, styles.centred]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <BinCard bin={result.bin} detail={binDetail(result, pickup)} />
        )}

        {result.nearest_dropoff && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nearest drop-off</Text>
            <Text style={type.body}>{result.nearest_dropoff.site.name}</Text>
            <Text style={type.caption}>{result.nearest_dropoff.site.address}</Text>
          </View>
        )}

        {result.tips.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Before it goes in</Text>
            {result.tips.map((tip, i) => (
              <View key={tip} style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <Text style={[type.body, { flex: 1 }]}>{tip}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          onPress={confirm}
          disabled={!canConfirm}
          style={({ pressed }) => [styles.confirm, !canConfirm && styles.disabled, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="I recycled it"
          accessibilityState={{ disabled: !canConfirm }}
        >
          {busy === "confirm" ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Text style={styles.confirmText}>I recycled it</Text>
              <View style={styles.pointsChip}>
                <Text style={styles.pointsChipText}>+{result.points} pts</Text>
              </View>
            </>
          )}
        </Pressable>
        <View style={styles.secondaryRow}>
          <Pressable
            onPress={() => router.back()}
            disabled={!!busy}
            style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Skip</Text>
          </Pressable>
          <Pressable
            onPress={() => setPicking(true)}
            disabled={!!busy || !scanId}
            style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Not right?</Text>
          </Pressable>
        </View>
      </View>

      <CategoryPicker visible={picking} onPick={correct} onClose={() => setPicking(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  empty: { alignItems: "center", justifyContent: "center", gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  centred: { alignItems: "center", justifyContent: "center", minHeight: 96 },
  itemCard: { flexDirection: "row", alignItems: "center" },
  photoBox: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: colors.primarySoft, overflow: "hidden" },
  photo: { width: "100%", height: "100%" },
  itemText: { flex: 1, gap: spacing.xs, alignItems: "flex-start" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.sm - 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeMuted: { backgroundColor: colors.track },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, color: colors.onPrimary },
  badgeTextMuted: { color: colors.textMuted },
  itemName: { fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 27, color: colors.text },
  cardTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  step: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  actions: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.sm, gap: spacing.sm },
  confirm: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    minHeight: 58,
  },
  disabled: { opacity: 0.45 },
  confirmText: { fontFamily: fonts.bold, fontSize: 17, color: colors.onPrimary },
  pointsChip: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: radius.sm - 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  pointsChipText: { fontFamily: fonts.bold, fontSize: 13, color: colors.onPrimary },
  secondaryRow: { flexDirection: "row", gap: spacing.sm },
  secondary: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
});
