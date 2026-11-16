import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

// The phone's "Reduce Motion" setting. When it is on, the app uses simple fades: no
// slides, bounces, shakes or confetti. (Reanimated's own animations follow it by
// themselves; this is for the rest.)
let reduced = false;
const listeners = new Set();
const set = (value) => {
  reduced = Boolean(value);
  listeners.forEach((fn) => fn(reduced));
};

if (Platform.OS === "web") {
  if (typeof window !== "undefined" && window.matchMedia) {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced = query.matches;
    query.addEventListener?.("change", (e) => set(e.matches));
  }
} else {
  AccessibilityInfo.isReduceMotionEnabled?.().then(set, () => {});
  AccessibilityInfo.addEventListener?.("reduceMotionChanged", set);
}

export const prefersReducedMotion = () => reduced;

export function useReducedMotion() {
  const [value, setValue] = useState(reduced);
  useEffect(() => {
    listeners.add(setValue);
    setValue(reduced);
    return () => listeners.delete(setValue);
  }, []);
  return value;
}

// A light vibration where the phone allows it. Android does; iPhones don't let web apps
// vibrate, so there this does nothing.
export function buzz(pattern = 12) {
  if (reduced) return;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(pattern);
  } catch {
    // Not allowed here; never mind.
  }
}
