// Home's "Up next" banner, and the sheet where the player sets their pickup day.
// No pickup day yet → the banner asks for one.

import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import Chips from "@/components/Chips";
import Sheet from "@/components/Sheet";
import { api, type NextPickup, type RecyclingWeek, type Weekday } from "@/lib/api";
import { errorText } from "@/lib/useLoad";
import { colors, fonts, radius, spacing, type } from "@/theme";

const DAYS: { value: Weekday; label: string }[] = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
];

const WEEKS: { value: RecyclingWeek; label: string }[] = [
  { value: "blue_bin", label: "Blue bin" },
  { value: "black_bin", label: "Black bin" },
];

type Props = { pickup: NextPickup | null; pickupDay?: Weekday; onSaved: (pickup: NextPickup) => void };

export default function PickupBanner({ pickup, pickupDay, onSaved }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.banner, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityHint={pickup ? "Change your pickup day" : undefined}
      >
        <View style={styles.icon}>
          <Feather name={pickup ? "trash-2" : "calendar"} size={20} color={colors.onPrimary} />
        </View>
        <View style={styles.text}>
          <Text style={type.label}>UP NEXT</Text>
          <Text style={styles.title} numberOfLines={1}>
            {pickup ? pickup.label : "Set your pickup day"}
          </Text>
          {pickup?.holiday ? <Text style={type.caption}>Moved a day for {pickup.holiday}</Text> : null}
          {!pickup ? <Text style={type.caption}>See which bins go out next</Text> : null}
        </View>
        <Feather name="chevron-right" size={20} color={colors.textMuted} />
      </Pressable>

      <ScheduleSheet
        visible={open}
        initialDay={pickupDay}
        onClose={() => setOpen(false)}
        onSaved={(p) => {
          setOpen(false);
          onSaved(p);
        }}
      />
    </>
  );
}

type SheetProps = { visible: boolean; initialDay?: Weekday; onClose: () => void; onSaved: (pickup: NextPickup) => void };

function ScheduleSheet({ visible, initialDay, onClose, onSaved }: SheetProps) {
  const [day, setDay] = useState<Weekday>(initialDay ?? "monday");
  const [week, setWeek] = useState<RecyclingWeek>("blue_bin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      onSaved(await api.setSchedule({ pickup_day: day, this_week: week }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} title="Your pickup day" onClose={onClose}>
      <Text style={type.caption}>Which day does the city collect on your street?</Text>
      <Chips options={DAYS} value={day} onChange={setDay} label="Pickup day" />
      <Text style={[type.caption, styles.gap]}>Which recycling bin goes out this week?</Text>
      <Chips options={WEEKS} value={week} onChange={setWeek} label="This week's bin" />
      <Text style={type.caption}>Blue and black swap every week. The green bin goes out every week.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        onPress={save}
        disabled={busy}
        style={({ pressed }) => [styles.save, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
      >
        {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.saveText}>Save</Text>}
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.dark, alignItems: "center", justifyContent: "center" },
  text: { flex: 1 },
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  gap: { marginTop: spacing.sm },
  error: { ...type.body, color: colors.danger },
  save: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center", marginTop: spacing.sm },
  saveText: { fontFamily: fonts.bold, fontSize: 16, color: colors.onPrimary },
});
