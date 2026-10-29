// Home's Discover weekly card with the API faked.

import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import Home from "@/app/(tabs)/index";
import { api, ApiError } from "@/lib/api";
import { binColors } from "@/theme";

import { fakeDiscover, fakeProfile } from "@/test-utils/fixtures";

jest.mock("@/lib/supabase", () => ({ getAccessToken: jest.fn(async () => "test-token") }));
jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return { ...actual, api: { health: jest.fn(), me: jest.fn(), discoverCurrent: jest.fn() } };
});
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return { useFocusEffect: (effect: () => void) => useEffect(effect, [effect]) };
});

const mockApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.health.mockResolvedValue({ status: "ok" });
  mockApi.me.mockResolvedValue(fakeProfile());
});

test("shows this week's tricky item, its bin and the bonus", async () => {
  mockApi.discoverCurrent.mockResolvedValue(fakeDiscover());

  await render(<Home />);

  expect(await screen.findByText("Greasy pizza box")).toBeTruthy();
  expect(screen.getByText("DISCOVER WEEKLY")).toBeTruthy();
  expect(screen.getByText("+20 pts")).toBeTruthy();
  expect(screen.getByText("Green bin")).toBeTruthy();
  expect(StyleSheet.flatten(screen.getByTestId("discover-bin").props.style).backgroundColor).toBe(binColors.green_bin);
  expect(screen.getByText("Scan one this week for the bonus.")).toBeTruthy();
});

test("once found, the bonus shows as collected", async () => {
  mockApi.discoverCurrent.mockResolvedValue(fakeDiscover({ found: true }));

  await render(<Home />);

  expect(await screen.findByText("Found ✓")).toBeTruthy();
  expect(screen.queryByText("+20 pts")).toBeNull();
  expect(screen.getByText("Bonus collected this week. Nice!")).toBeTruthy();
});

test("Home still works when Discover can't load", async () => {
  mockApi.discoverCurrent.mockRejectedValue(new ApiError(500, "Something went wrong"));

  await render(<Home />);

  expect(await screen.findByText("Connected ✓")).toBeTruthy();
  expect(screen.queryByTestId("discover-card")).toBeNull();
});
