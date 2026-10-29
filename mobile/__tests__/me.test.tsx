// The Me tab with the API faked.

import { act, fireEvent, render, screen } from "@testing-library/react-native";

import Me from "@/app/(tabs)/me";
import { api, ApiError } from "@/lib/api";

import { fakeBadges, fakeProfile } from "@/test-utils/fixtures";

jest.mock("@/lib/supabase", () => ({ getAccessToken: jest.fn(async () => "test-token") }));
jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return { ...actual, api: { me: jest.fn(), updateMe: jest.fn() } };
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

test("a failed load shows the backend's message, and Try again reloads", async () => {
  mockApi.me.mockRejectedValueOnce(new ApiError(401, "Your login has expired. Sign in again."));

  await render(<Me />);
  expect(await screen.findByText("Couldn't load your profile")).toBeTruthy();
  expect(screen.getByText("Your login has expired. Sign in again.")).toBeTruthy();

  mockApi.me.mockResolvedValue(fakeProfile());
  await fireEvent.press(screen.getByText("Try again"));

  expect(await screen.findByText("Sam")).toBeTruthy();
});

test("a spinner shows while loading", async () => {
  mockApi.me.mockReturnValue(new Promise(() => {}));

  await render(<Me />);

  expect(screen.getByTestId("loading")).toBeTruthy();
});

test("the edit button changes your name and avatar", async () => {
  mockApi.me.mockResolvedValue(fakeProfile());
  mockApi.updateMe.mockResolvedValue(fakeProfile({ name: "Samira", avatar: "owl" }));

  await render(<Me />);
  await fireEvent.press(await screen.findByLabelText("Edit profile"));

  const input = screen.getByLabelText("Your name");
  expect(input.props.value).toBe("Sam");
  await fireEvent.changeText(input, "  Samira ");
  await fireEvent.press(screen.getByLabelText("owl"));
  await fireEvent.press(screen.getByText("Save"));

  expect(mockApi.updateMe).toHaveBeenCalledWith({ name: "Samira", avatar: "owl" });
  expect(await screen.findByText("Samira")).toBeTruthy();
  expect(screen.getByText("🦉")).toBeTruthy();
  expect(screen.queryByLabelText("Your name")).toBeNull(); // sheet closed
});

test("a rejected name shows the backend's message and keeps the sheet open", async () => {
  mockApi.me.mockResolvedValue(fakeProfile());
  mockApi.updateMe.mockRejectedValue(new ApiError(422, "Name is too long"));

  await render(<Me />);
  await fireEvent.press(await screen.findByLabelText("Edit profile"));
  await fireEvent.press(screen.getByText("Save"));

  expect(await screen.findByText("Name is too long")).toBeTruthy();
  expect(screen.getByLabelText("Your name")).toBeTruthy();
});

test("pull to refresh loads fresh stats", async () => {
  mockApi.me.mockResolvedValue(fakeProfile());
  await render(<Me />);
  await screen.findByText("42");

  mockApi.me.mockResolvedValue(fakeProfile({ items_sorted: 43 }));
  await act(async () => {
    await screen.getByTestId("me-scroll").props.refreshControl.props.onRefresh();
  });

  expect(screen.getByText("43")).toBeTruthy();
});
