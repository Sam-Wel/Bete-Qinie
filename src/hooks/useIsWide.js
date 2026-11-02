import { useSyncExternalStore } from "react";
import { Dimensions } from "react-native";

// Past this width the sidebar is always shown; below it the phone tabs are.
export const WIDE = 900;

const subscribe = (onChange) => {
  const sub = Dimensions.addEventListener("change", onChange);
  return () => sub?.remove?.();
};

// The pre-rendered web page has no window size, so hydration starts with the
// phone layout (server snapshot) and switches right after if the screen is wide.
export function useIsWide() {
  return useSyncExternalStore(
    subscribe,
    () => Dimensions.get("window").width >= WIDE,
    () => false
  );
}
