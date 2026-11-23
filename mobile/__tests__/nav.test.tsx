// The floating nav bar: Home, Board, [Scan], Wrapped, Me.

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { StyleSheet } from "react-native";

import NavBar from "@/components/NavBar";
import { navBottom } from "@/components/Screen";
import { theme } from "@/theme";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ router: { push: (path: string) => mockPush(path) } }));

beforeEach(() => mockPush.mockClear());

// The props expo-router's tab navigator hands the nav, for four tabs
function navProps(open: number) {
  const names = ["index", "board", "wrapped", "me"];
  const titles = ["Home", "Board", "Wrapped", "Me"];
  const routes = names.map((name) => ({ key: `${name}-key`, name }));
  return {
    state: { index: open, routes },
    descriptors: Object.fromEntries(routes.map((r, i) => [r.key, { options: { title: titles[i] } }])),
    emitter: { emit: jest.fn(() => ({ defaultPrevented: false })) },
    navigateToTab: jest.fn(),
    insets: { top: 0, bottom: 34, left: 0, right: 0 },
  };
}

test("the nav has Home, Board, Scan, Wrapped, Me with Scan in the middle, each with its icon and label", async () => {
  await render(<NavBar {...(navProps(0) as unknown as BottomTabBarProps)} />);

  const labels = screen.getAllByRole(/tab|button/).map((el) => el.props.accessibilityLabel);
  expect(labels).toEqual(["Home", "Board", "Scan an item", "Wrapped", "Me"]);
  for (const icon of ["House", "ChartNoAxesColumn", "Focus", "Star", "User"]) {
    expect(screen.getByTestId(`icon-${icon}`)).toBeTruthy();
  }
  for (const label of ["Home", "Board", "Wrapped", "Me"]) expect(screen.getByText(label)).toBeTruthy();
});

test("only the open tab is selected, and its label is bold cream", async () => {
  await render(<NavBar {...(navProps(1) as unknown as BottomTabBarProps)} />);

  expect(screen.getByRole("tab", { name: "Board" })).toBeSelected();
  expect(screen.getByRole("tab", { name: "Home" })).not.toBeSelected();
  const on = StyleSheet.flatten(screen.getByText("Board").props.style);
  const off = StyleSheet.flatten(screen.getByText("Home").props.style);
  expect(on.color).toBe(theme.colors.onForest);
  expect(off.color).toBe(theme.colors.onForestMuted);
});

test("tapping a tab opens it, and Scan opens the camera", async () => {
  const props = navProps(0);
  await render(<NavBar {...(props as unknown as BottomTabBarProps)} />);

  await fireEvent.press(screen.getByRole("tab", { name: "Wrapped" }));
  expect(props.navigateToTab).toHaveBeenCalledWith("wrapped-key");

  await fireEvent.press(screen.getByRole("button", { name: "Scan an item" }));
  expect(mockPush).toHaveBeenCalledWith("/scan");
});

test("tapping the tab you're on does nothing", async () => {
  const props = navProps(0);
  await render(<NavBar {...(props as unknown as BottomTabBarProps)} />);

  await fireEvent.press(screen.getByRole("tab", { name: "Home" }));
  expect(props.navigateToTab).not.toHaveBeenCalled();
});

test("the bar sits 18 pt up on an iPhone and 12 pt up on phones without a home bar", () => {
  expect(navBottom(34)).toBe(18);
  expect(navBottom(0)).toBe(12);
});
