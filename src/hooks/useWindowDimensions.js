import { useSyncExternalStore } from "react";
import { Dimensions } from "react-native";

// The window's size, like React Native's useWindowDimensions, but safe for the web's
// pre-built pages. Those are drawn with no window (0 × 0), so while the browser takes a
// page over this reports the same 0 × 0, then the real size straight after. Reading the
// real size during that first render made width-dependent layouts (a phone card vs a
// wide one) differ from the pre-built page, which React reports as a hydration error.
const SERVER = { width: 0, height: 0, scale: 1, fontScale: 1 };

let current = null;
const read = () => {
  const w = Dimensions.get("window");
  if (!current || current.width !== w.width || current.height !== w.height || current.scale !== w.scale || current.fontScale !== w.fontScale) {
    current = { width: w.width, height: w.height, scale: w.scale, fontScale: w.fontScale };
  }
  return current;
};

const subscribe = (onChange) => {
  const sub = Dimensions.addEventListener("change", onChange);
  return () => sub?.remove?.();
};

export function useWindowDimensions() {
  return useSyncExternalStore(subscribe, read, () => SERVER);
}
