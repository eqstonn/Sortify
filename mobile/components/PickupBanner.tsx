// Home's "Up next" card: the terracotta bin tile, the next pickup, and a chevron.
// Tapping it opens the sheet where the player sets their pickup day.
// No pickup day yet → the card asks for one.

import { Calendar, ChevronRight, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";

import ActionButton from "@/components/ActionButton";
import Card from "@/components/Card";
import Chips from "@/components/Chips";
import IconTile from "@/components/IconTile";
import Sheet from "@/components/Sheet";
import { api, type NextPickup, type RecyclingWeek, type Weekday } from "@/lib/api";
import { makeStyles, useTheme } from "@/lib/theme";
import { errorText } from "@/lib/useLoad";
import { spacing } from "@/theme";

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
  const { colors, type } = useTheme();
  const s = useStyles();

  return (
    <>
      <Card
        onPress={() => setOpen(true)}
        padding={12}
        style={s.card}
        accessibilityLabel={pickup ? `Up next: ${pickup.label}` : "Set your pickup day"}
        accessibilityHint={pickup ? "Change your pickup day" : undefined}
        testID="up-next"
      >
        <IconTile icon={pickup ? Trash2 : Calendar} tone="terracotta" size={42} />
        <View style={s.text}>
          <Text style={[type.label, s.overline]}>UP NEXT</Text>
          <Text style={type.cardTitle} numberOfLines={1}>
            {pickup ? pickup.label : "Set your pickup day"}
          </Text>
          {pickup?.holiday ? <Text style={type.caption}>Moved a day for {pickup.holiday}</Text> : null}
          {!pickup ? <Text style={type.caption}>See which bins go out next</Text> : null}
        </View>
        <ChevronRight size={22} color={colors.text} strokeWidth={2} />
      </Card>

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
  const { type } = useTheme();
  const s = useStyles();

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
      <Text style={[type.caption, s.gap]}>Which recycling bin goes out this week?</Text>
      <Chips options={WEEKS} value={week} onChange={setWeek} label="This week's bin" />
      <Text style={type.caption}>Blue and black swap every week. The green bin goes out every week.</Text>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <ActionButton label="Save" onPress={save} busy={busy} style={s.gap} />
    </Sheet>
  );
}

const useStyles = makeStyles(({ colors, type }) => ({
  card: { flexDirection: "row", alignItems: "center", gap: 14, paddingRight: 16 },
  text: { flex: 1, gap: 2 },
  overline: { color: colors.text },
  gap: { marginTop: spacing.sm },
  error: { ...type.body, color: colors.danger },
}));
