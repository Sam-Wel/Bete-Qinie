import { Platform } from "react-native";
import { palettes } from "./palettes";

// On the web every token is a CSS variable, so switching light/dark is one
// attribute on <html> (see src/app/+html.jsx and src/hooks/useColorTheme.js).
// Native builds use the light palette as plain values.
export const colors =
  Platform.OS === "web"
    ? Object.fromEntries(Object.keys(palettes.light).map((k) => [k, `var(--c-${k})`]))
    : { ...palettes.light };
