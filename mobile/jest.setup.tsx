// Runs before every test file.

// Safe-area insets need a native provider; the library ships a mock that returns zeros
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);

// Icon fonts can't load in tests; draw each icon as nothing, keeping its name for debugging
jest.mock("@expo/vector-icons", () => {
  const { View } = jest.requireActual("react-native");
  const Icon = ({ name }: { name: string }) => <View testID={`icon-${name}`} />;
  Icon.glyphMap = {};
  return { Feather: Icon, MaterialCommunityIcons: Icon };
});
