// On a drop-off item's result (electronics, batteries, hazardous): the nearest
// drop-off site to you, with a Directions button that opens Google Maps.
// Without your location it offers a Google Maps search instead.

import { MapPin, Navigation, Search } from "lucide-react-native";
import { ActivityIndicator, Linking, Text, View } from "react-native";

import ActionButton from "@/components/ActionButton";
import Card from "@/components/Card";
import IconTile from "@/components/IconTile";
import type { DropoffType } from "@/lib/api";
import { directionsUrl, type DropoffState, searchUrl } from "@/lib/dropoff";
import { makeStyles, useTheme } from "@/lib/theme";
import { spacing } from "@/theme";

type Props = { type: DropoffType | null; lookup: DropoffState };

export default function DropoffCard({ type, lookup }: Props) {
  const { colors, type: text } = useTheme();
  const s = useStyles();

  if (lookup.state === "locating") {
    return (
      <Card style={s.card} testID="dropoff-card">
        <View style={s.row}>
          <ActivityIndicator color={colors.accent} />
          <Text style={text.caption}>Finding the nearest drop-off…</Text>
        </View>
      </Card>
    );
  }

  if (lookup.state === "found") {
    const { site, distance_km } = lookup.nearest;
    return (
      <Card style={s.card} testID="dropoff-card">
        <View style={s.row}>
          <IconTile icon={MapPin} tone="terracotta" size={42} />
          <View style={s.text}>
            <Text style={text.label}>NEAREST DROP-OFF</Text>
            <Text style={text.cardTitle}>{site.name}</Text>
            <Text style={text.caption}>
              {site.address} · {distance_km.toFixed(1)} km away
            </Text>
          </View>
        </View>
        <ActionButton
          label="Directions"
          icon={Navigation}
          accessibilityLabel={`Directions to ${site.name} in Google Maps`}
          onPress={() => Linking.openURL(directionsUrl(site, lookup.from))}
        />
      </Card>
    );
  }

  // No location, or the lookup failed: Google Maps can still search near you
  return (
    <Card style={s.card} testID="dropoff-card">
      <View style={s.row}>
        <IconTile icon={MapPin} size={42} />
        <View style={s.text}>
          <Text style={text.cardTitle}>Take it to a drop-off</Text>
          <Text style={text.caption}>
            {lookup.state === "noLocation"
              ? "Allow location to see the nearest site and get directions."
              : "Couldn't find the nearest site right now."}
          </Text>
        </View>
      </View>
      <ActionButton
        variant="secondary"
        label="Find drop-offs in Google Maps"
        icon={Search}
        onPress={() => Linking.openURL(searchUrl(type))}
      />
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  card: { gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  text: { flex: 1, gap: 2 },
}));
