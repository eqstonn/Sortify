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

// Lucide icons (SVG, shipped as ES modules) the same way: any icon name works,
// e.g. <House /> renders <View testID="icon-House" />
jest.mock("lucide-react-native", () => {
  const { View } = jest.requireActual("react-native");
  const icons: Record<string, unknown> = {};
  const icon = (name: string) => {
    const Icon = () => <View testID={`icon-${name.replace(/Icon$/, "")}`} />;
    Icon.displayName = name;
    return Icon;
  };
  return new Proxy(
    {},
    { get: (_target, name) => (name === "__esModule" ? true : typeof name === "string" ? (icons[name] ??= icon(name)) : undefined) },
  );
});

// Glass blur is a native view; in tests it's a plain View
jest.mock("expo-blur", () => {
  const { View } = jest.requireActual("react-native");
  return { BlurView: View };
});

// Settings storage (lib/kv.ts) in memory; each test file starts empty
jest.mock("expo-sqlite/kv-store", () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItemSync: (key: string) => store.get(key) ?? null,
      setItemSync: (key: string, value: string) => void store.set(key, value),
      clearSync: () => store.clear(),
    },
  };
});

// The phone's location (lib/dropoff.ts): refused unless a test says otherwise
jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: "denied" })),
  getCurrentPositionAsync: jest.fn(),
}));
