// The Me tab with the API faked.

import { render, screen } from "@testing-library/react-native";

import Me from "@/app/(tabs)/me";
import { api, ApiError } from "@/lib/api";

import { fakeBadges, fakeProfile } from "@/test-utils/fixtures";

jest.mock("@/lib/supabase", () => ({ getAccessToken: jest.fn(async () => "test-token") }));
jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return { ...actual, api: { me: jest.fn() } };
});
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return { useFocusEffect: (effect: () => void) => useEffect(effect, [effect]) };
});

const mockApi = api as jest.Mocked<typeof api>;

beforeEach(() => jest.clearAllMocks());

test("shows the name, level and the four stat tiles", async () => {
  mockApi.me.mockResolvedValue(fakeProfile());

  await render(<Me />);

  expect(await screen.findByText("Sam")).toBeTruthy();
  expect(screen.getByText("Level 3 Sapling")).toBeTruthy();
  expect(screen.getByText("1,240")).toBeTruthy();
  expect(screen.getByText("42")).toBeTruthy();
  expect(screen.getByText("3.2 kg")).toBeTruthy();
  expect(screen.getByText("6 days")).toBeTruthy();
});

test('"What you sort" has a bar per material, labelled for people', async () => {
  mockApi.me.mockResolvedValue(
    fakeProfile({
      breakdown: [
        { material: "plastic", count: 31, percent: 36 },
        { material: "electronics", count: 7, percent: 8 },
      ],
    }),
  );

  await render(<Me />);

  expect(await screen.findByText("Plastic")).toBeTruthy();
  expect(screen.getByText("E-waste")).toBeTruthy();
  expect(screen.getByText("31")).toBeTruthy();
  expect(screen.getByText("7")).toBeTruthy();
});

test("a new player is told to scan instead of seeing empty bars", async () => {
  mockApi.me.mockResolvedValue(fakeProfile({ breakdown: [], badges: fakeBadges([]) }));

  await render(<Me />);

  expect(await screen.findByText("Scan your first item to see what you sort.")).toBeTruthy();
  expect(screen.getByText("0 of 4")).toBeTruthy();
});

test("badges come from the backend: earned ones show their icon, the rest are locked", async () => {
  mockApi.me.mockResolvedValue(fakeProfile({ badges: fakeBadges(["first_sort", "ewaste_hero", "streak_7"]) }));

  await render(<Me />);

  expect(await screen.findByText("3 of 4")).toBeTruthy();
  expect(screen.getByLabelText("First sort, earned")).toBeTruthy();
  expect(screen.getByLabelText("E-waste hero, earned")).toBeTruthy();
  expect(screen.getByLabelText("7-day streak, earned")).toBeTruthy();
  expect(screen.getByLabelText("Glass master, locked. Sort 10 glass bottles or jars")).toBeTruthy();
  expect(screen.getByTestId("icon-fire")).toBeTruthy();
  expect(screen.getAllByTestId("icon-lock")).toHaveLength(1);
});

test("a failed load shows the backend's message", async () => {
  mockApi.me.mockRejectedValue(new ApiError(401, "Your login has expired. Sign in again."));

  await render(<Me />);

  expect(await screen.findByText("Your login has expired. Sign in again.")).toBeTruthy();
});
