// For drop-off items (electronics, batteries, hazardous): find the nearest
// drop-off site from where you are, and open Google Maps directions to it.
//
// Your location is only used for this: the app asks for it when a drop-off
// item's result opens, sends it to GET /dropoffs/nearest (which doesn't save
// it), and puts it in the Google Maps link if you tap Directions.

import * as Location from "expo-location";
import { useEffect, useState } from "react";

import { api, type DropoffSite, type DropoffType, type NearestDropoff } from "@/lib/api";

export type Spot = { lat: number; lon: number };

export type DropoffState =
  | { state: "locating" }
  | { state: "found"; nearest: NearestDropoff; from: Spot }
  | { state: "noLocation" } // permission refused, or the phone couldn't get a fix
  | { state: "failed" }; // the backend couldn't answer (or knows no site for this)

/** Google Maps directions from `from` to the site. Opens the Maps app on a phone if it's installed. */
export function directionsUrl(site: DropoffSite, from?: Spot): string {
  const q = new URLSearchParams({ api: "1", destination: `${site.name}, ${site.address}` });
  if (from) q.set("origin", `${from.lat},${from.lon}`); // without it, Maps starts from your location itself
  return `https://www.google.com/maps/dir/?${q}`;
}

const SEARCH: Record<DropoffType, string> = {
  electronics: "electronics recycling drop-off",
  batteries: "battery recycling drop-off",
  hazardous: "household hazardous waste drop-off",
};

/** Without your location: a Google Maps search, which shows places near you anyway. */
export function searchUrl(type: DropoffType | null): string {
  const q = new URLSearchParams({ api: "1", query: `${SEARCH[type ?? "electronics"]} Ottawa` });
  return `https://www.google.com/maps/search/?${q}`;
}

/** Where you are, or null if you said no or the phone can't tell. */
async function whereAmI(): Promise<Spot | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    // Balanced: a few hundred metres is plenty to pick a site, and it's much quicker than GPS
    const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: coords.latitude, lon: coords.longitude };
  } catch {
    return null;
  }
}

/**
 * Looks up the nearest site that takes `type` (any site if it's null).
 * Does nothing while `enabled` is false (the item isn't a drop-off one).
 */
export function useNearestDropoff(enabled: boolean, type: DropoffType | null): DropoffState {
  const key = enabled ? (type ?? "any") : null;
  const [result, setResult] = useState<{ key: string; value: DropoffState } | null>(null);

  useEffect(() => {
    if (!key) return;
    let live = true;
    (async () => {
      const from = await whereAmI();
      let value: DropoffState;
      if (!from) value = { state: "noLocation" };
      else {
        try {
          value = { state: "found", nearest: await api.nearestDropoff(from.lat, from.lon, type ?? undefined), from };
        } catch {
          value = { state: "failed" };
        }
      }
      if (live) setResult({ key, value });
    })();
    return () => {
      live = false;
    };
  }, [key, type]);

  // A result for an older item (the player corrected it) counts as still looking
  return result && result.key === key ? result.value : { state: "locating" };
}
