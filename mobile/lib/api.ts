// Typed client for the Sortify backend. The types mirror app/schemas.py;
// keep them in sync when the backend changes. All scoring happens on the
// backend; the app only shows what comes back.

import { Platform } from "react-native";

import { getAccessToken } from "@/lib/supabase";

// ---------- types (app/schemas.py) ----------

export type Bin = "blue_bin" | "black_bin" | "green_bin" | "garbage" | "dropoff" | "unsure";
export type DropoffType = "electronics" | "batteries" | "hazardous";
export type Rarity = "common" | "uncommon" | "rare";
export type ScanStatus = "pending" | "confirmed";
export type LeaderboardRange = "week" | "all";
export type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
export type RecyclingWeek = "blue_bin" | "black_bin";
export type Avatar =
  | "sprout" | "leaf" | "tree" | "cactus" | "flower"
  | "mushroom" | "bee" | "fox" | "owl" | "turtle";

// Dates arrive as ISO strings: "2026-10-27" for dates, "2026-10-24T18:03:00Z" for times

export interface Category {
  id: string;
  name: string;
  material: string;
  bin: Bin;
  dropoff_type: DropoffType | null;
  points: number;
  rarity: Rarity;
  kg_estimate: number;
  tips: string[];
  examples: string[];
  verify: boolean;
}

export interface DropoffSite {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  accepts: DropoffType[];
  notes: string;
  verify: boolean;
}

export interface NearestDropoff {
  site: DropoffSite;
  distance_km: number;
}

export interface Disposal {
  category_id: string;
  name: string;
  material: string;
  recyclable: boolean;
  bin: Bin;
  dropoff_type: DropoffType | null;
  points: number;
  tips: string[];
}

/** POST /classify and POST /scans/{id}/correct: everything the result screen shows. */
export interface ClassifyResult extends Disposal {
  item: string; // what Gemini saw, e.g. "Coke can"
  confidence: number; // 0 to 1
  scan_id: string | null;
  nearest_dropoff: NearestDropoff | null;
}

export interface ScanOut {
  id: string;
  category_id: string;
  name: string;
  item: string;
  bin: Bin;
  corrected: boolean;
  status: ScanStatus;
  points_awarded: number;
  created_at: string;
  confirmed_at: string | null;
}

export interface CorrectIn {
  category_id: string;
  lat?: number;
  lon?: number;
}

export interface ConfirmResult {
  scan_id: string;
  category_id: string;
  points_awarded: number;
  total_points: number;
  notes: string[]; // e.g. "+15 bonus for your first aluminum can!"
  new_badges?: string[]; // badge ids this scan earned, e.g. ["first_sort"]
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  avatar: string;
  points: number;
  items?: number | null; // items sorted in this range; missing until 004_leaderboard_items.sql is run
  is_me: boolean;
}

export interface LeaderboardOut {
  range: LeaderboardRange;
  entries: LeaderboardEntry[]; // top 20
  me: LeaderboardEntry | null; // null until you score
}

export interface Level {
  number: number; // 1 = Seed
  name: string;
  min_points: number;
  next_name: string | null; // null at the top level
  next_at: number | null;
  points_to_next: number;
  progress: number; // 0 to 1
}

export interface MaterialShare {
  material: string;
  count: number;
  percent: number;
}

export interface Schedule {
  pickup_day: Weekday;
  blue_week_of: string;
}

export interface BadgeOut {
  id: string; // "first_sort", "ewaste_hero", "streak_7", "glass_master"
  name: string;
  description: string;
  earned: boolean;
  earned_at: string | null;
}

export interface ProfileOut {
  id: string;
  name: string;
  avatar: string;
  total_points: number;
  level: Level;
  items_sorted: number;
  kg_diverted: number;
  items_this_week: number;
  current_streak: number;
  longest_streak: number;
  rank: number | null; // null until you score
  breakdown: MaterialShare[]; // most-sorted first
  schedule: Schedule | null;
  badges: BadgeOut[]; // every badge, earned ones first
}

export interface ProfileUpdate {
  name?: string; // 1 to 30 characters
  avatar?: Avatar;
}

export interface ScheduleIn {
  pickup_day: Weekday;
  this_week: RecyclingWeek;
}

export interface NextPickup {
  pickup_date: string;
  days_away: number; // 0 = today
  bins: Bin[];
  label: string; // "Black + green bin · Tue, Oct 27"
  holiday: string | null;
}

export interface MaterialCount {
  material: string;
  count: number;
  top_items: string[]; // most-sorted category names in this material, up to 2
}

export interface RarestFind {
  category_id: string;
  name: string; // category name, e.g. "Battery"
  item: string; // what Gemini saw, e.g. "old laptop battery"
  material: string;
  bin: Bin;
  rarity: Rarity;
  percent_of_players: number;
}

export interface TopRecycler {
  user_id: string;
  name: string;
  avatar: string;
  points: number; // this month
  is_me: boolean;
}

/** GET /wrapped/{year}/{month}: data for the 5 Wrapped cards. */
export interface WrappedOut {
  year: number;
  month: number; // 1 to 12
  items: number;
  kg: number;
  average_kg: number; // per player who sorted anything this month
  points: number;
  top_materials: MaterialCount[]; // top 5
  rarest_find: RarestFind | null;
  rank: number | null; // null if you scored nothing this month
  players: number;
  top_recycler: TopRecycler | null;
  busiest_day: string | null; // "sunday"
  longest_streak: number;
}

/** GET /discover/current: this week's tricky item. */
export interface DiscoverOut {
  week_of: string; // Monday
  ends_on: string; // Sunday
  category_id: string;
  item: string; // "Greasy pizza box"
  name: string;
  bin: Bin;
  bonus_points: number;
  explainer: string;
  tips: string[];
  found: boolean; // already sorted this week, bonus used
}

// ---------- errors ----------

/** Any failed request. `message` is safe to show to the player. */
export class ApiError extends Error {
  constructor(
    public status: number, // 0 = never reached the server
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// FastAPI sends {"detail": "text"}, or {"detail": [{msg: ...}]} for validation errors
function errorMessage(status: number, body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && typeof detail[0]?.msg === "string") return detail[0].msg;
  return `Something went wrong (error ${status}). Try again.`;
}

// ---------- requests ----------

function baseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) throw new Error("Missing EXPO_PUBLIC_API_URL. Add it to mobile/.env.");
  return url.replace(/\/+$/, "");
}

type Options = { method?: string; body?: unknown; auth?: boolean };

async function request<T>(path: string, { method = "GET", body, auth = true }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (auth) headers.Authorization = `Bearer ${await getAccessToken()}`;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body; // fetch sets the multipart boundary itself
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const url = baseUrl() + path;
  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, "Can't reach Sortify. Check your connection and try again.");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, errorMessage(res.status, data));
  return data as T;
}

// ---------- endpoints ----------

export const api = {
  health: () => request<{ status: string }>("/health", { auth: false }),

  categories: () => request<Category[]>("/categories", { auth: false }),

  nearestDropoff: (lat: number, lon: number, accepts?: DropoffType) => {
    const q = new URLSearchParams({ lat: String(lat), lon: String(lon) });
    if (accepts) q.set("accepts", accepts);
    return request<NearestDropoff>(`/dropoffs/nearest?${q}`, { auth: false });
  },

  /** Send a photo (a file uri from the camera or gallery). Location is optional, for drop-offs. */
  classify: async (photoUri: string, location?: { lat: number; lon: number }) => {
    const form = new FormData();
    if (Platform.OS === "web") {
      // On web the uri is a blob: URL, so send the actual file
      form.append("image", await (await fetch(photoUri)).blob(), "photo.jpg");
    } else {
      // React Native reads the file from the uri when it sends the form
      form.append("image", { uri: photoUri, name: "photo.jpg", type: "image/jpeg" } as unknown as Blob);
    }
    if (location) {
      form.append("lat", String(location.lat));
      form.append("lon", String(location.lon));
    }
    return request<ClassifyResult>("/classify", { method: "POST", body: form });
  },

  /** "I recycled it" */
  confirmScan: (scanId: string) => request<ConfirmResult>(`/scans/${scanId}/confirm`, { method: "POST" }),

  /** "Not right?": the player picked a different category */
  correctScan: (scanId: string, body: CorrectIn) =>
    request<ClassifyResult>(`/scans/${scanId}/correct`, { method: "POST", body }),

  myScans: () => request<ScanOut[]>("/scans/me"),

  leaderboard: (range: LeaderboardRange = "week") => request<LeaderboardOut>(`/leaderboard?range=${range}`),

  me: () => request<ProfileOut>("/me"),

  updateMe: (body: ProfileUpdate) => request<ProfileOut>("/me", { method: "PATCH", body }),

  /** The "Up next" banner, or null if the player hasn't set a pickup day yet. */
  nextPickup: async () => {
    try {
      return await request<NextPickup>("/schedule/next");
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },

  setSchedule: (body: ScheduleIn) => request<NextPickup>("/me/schedule", { method: "PUT", body }),

  /** month is 1 to 12 */
  wrapped: (year: number, month: number) => request<WrappedOut>(`/wrapped/${year}/${month}`),

  discoverCurrent: () => request<DiscoverOut>("/discover/current"),
};
