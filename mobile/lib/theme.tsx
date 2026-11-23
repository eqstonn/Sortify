// The app's one look: the light "cozy garden" theme from theme.ts (there is no
// dark mode). Components read colours with useTheme(), or build their styles
// with makeStyles().

import { StyleSheet } from "react-native";

import { type Theme, theme } from "@/theme";

/** The colours and type scale. */
export function useTheme(): Theme {
  return theme;
}

/**
 * Themed StyleSheets: write the styles once as a function of the theme, get a
 * hook that returns them. The sheet is made the first time it's used.
 *
 *   const useStyles = makeStyles(({ colors }) => ({ card: { backgroundColor: colors.card } }));
 *   const s = useStyles();
 */
export function makeStyles<S extends StyleInput>(factory: (theme: Theme) => S & StyleInput) {
  let sheet: Readonly<S> | undefined;
  return function useStyles(): Readonly<S> {
    return (sheet ??= StyleSheet.create<S>(factory(theme)));
  };
}

// Whatever StyleSheet.create accepts (same typing, so "row" stays "row" and not string)
type StyleInput = Parameters<typeof StyleSheet.create>[0];
