import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { THEME_KEY } from "../theme/palettes";

export const THEME_CHOICES = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
];

const listeners = new Set();

function read() {
  try {
    return globalThis.localStorage?.getItem(THEME_KEY) || "system";
  } catch {
    return "system";
  }
}

export function setColorTheme(choice) {
  try {
    globalThis.localStorage?.setItem(THEME_KEY, choice);
  } catch {}
  globalThis.window?.__beteQinieApplyTheme?.();
  listeners.forEach((l) => l());
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

// The saved choice: "system" (follow the device), "light" or "dark". Web only.
export function useColorTheme() {
  const choice = useSyncExternalStore(subscribe, read, () => "system");
  return { choice, setChoice: setColorTheme, available: Platform.OS === "web" };
}
