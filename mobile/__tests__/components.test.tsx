// The redesign's shared pieces: chunky card, buttons, text field, avatar, progress bar.

import { fireEvent, render, screen } from "@testing-library/react-native";
import { Mail } from "lucide-react-native";
import { StyleSheet, Text } from "react-native";

import ActionButton from "@/components/ActionButton";
import Avatar, { avatarUri } from "@/components/Avatar";
import Card from "@/components/Card";
import Pill from "@/components/Pill";
import ProgressBar from "@/components/ProgressBar";
import TextField from "@/components/TextField";
import { theme } from "@/theme";

const light = theme.colors;

test("a chunky card has the cream fill, the green edge and the solid band below", async () => {
  await render(
    <Card testID="card">
      <Text>Hi</Text>
    </Card>,
  );
  const style = StyleSheet.flatten(screen.getByTestId("card").props.style);
  expect(style.backgroundColor).toBe(light.card);
  expect(style.borderColor).toBe(light.line);
  expect(style.boxShadow).toBe(`0px 3px 0px 0px ${light.band}`);
});

test("a card with onPress is a button", async () => {
  const onPress = jest.fn();
  await render(
    <Card onPress={onPress} accessibilityLabel="Pizza boxes">
      <Text>Pizza boxes</Text>
    </Card>,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Pizza boxes" }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("a busy or disabled button can't be pressed", async () => {
  const onPress = jest.fn();
  await render(
    <>
      <ActionButton label="Sign in" busy onPress={onPress} />
      <ActionButton label="Google" variant="secondary" disabled onPress={onPress} />
    </>,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  await fireEvent.press(screen.getByRole("button", { name: "Google" }));
  expect(onPress).not.toHaveBeenCalled();
  expect(screen.queryByText("Sign in")).toBeNull(); // the spinner replaces the label
});

test("the text field shows its label, icon and right-hand extra, and marks focus on its edge", async () => {
  await render(<TextField label="Email" icon={Mail} placeholder="you@example.com" right={<Text>eye</Text>} />);

  expect(screen.getByText("Email")).toBeTruthy();
  expect(screen.getByTestId("icon-Mail")).toBeTruthy();
  expect(screen.getByText("eye")).toBeTruthy();

  const input = screen.getByLabelText("Email");
  const box = () => StyleSheet.flatten(screen.getByTestId("text-field-box").props.style);
  expect(box().borderColor).toBe(light.line);
  await fireEvent(input, "focus");
  expect(box().borderColor).toBe(light.progress);
  await fireEvent(input, "blur");
  expect(box().borderColor).toBe(light.line);
});

test("avatar: the default person without a photo, the photo when there is one", async () => {
  await render(<Avatar size={40} />);
  expect(screen.getByTestId("avatar-default")).toBeTruthy();
  expect(screen.queryByTestId("avatar-photo")).toBeNull();

  await render(<Avatar size={40} uri="https://example.com/a.jpg" />);
  expect(screen.getByTestId("avatar-photo")).toBeTruthy();
});

test("only http(s) avatar values count as photos (old emoji ids get the default)", () => {
  expect(avatarUri("https://x.supabase.co/storage/v1/object/public/avatars/u1.jpg")).toContain("avatars/u1.jpg");
  expect(avatarUri("fox")).toBeNull();
  expect(avatarUri("")).toBeNull();
  expect(avatarUri(null)).toBeNull();
});

test("the progress bar fills to the value, clamped to 0 to 100%", async () => {
  await render(<ProgressBar value={0.68} testID="fill" label="Level progress" />);
  expect(StyleSheet.flatten(screen.getByTestId("fill").props.style).width).toBe("68%");
  expect(screen.getByRole("progressbar")).toHaveAccessibilityValue({ now: 68 });

  await render(<ProgressBar value={1.7} testID="fill" />);
  expect(StyleSheet.flatten(screen.getByTestId("fill").props.style).width).toBe("100%");
});

test("the level pill is terracotta with cream text", async () => {
  await render(<Pill label="Level 3 · Sapling" testID="pill" />);
  expect(StyleSheet.flatten(screen.getByTestId("pill").props.style).backgroundColor).toBe(light.terracotta);
  expect(screen.getByText("Level 3 · Sapling")).toBeTruthy();
});
