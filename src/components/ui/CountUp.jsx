import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useReducedMotion } from "../../lib/motion";

// The last value each counter showed, so a number counts up from where it was (5 → 8
// after a session) rather than from 0 on every visit.
const lastShown = new Map();

// A number that counts to its new value. `id` names the counter; the first time it is
// shown it just appears. Renders a bare Text, so it can sit inside a styled Text.
export function CountUp({ value, id, duration = 650, style }) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(() => (lastShown.has(id) ? lastShown.get(id) : value));

  useEffect(() => {
    const from = lastShown.has(id) ? lastShown.get(id) : value;
    lastShown.set(id, value);
    if (reduced || from === value || typeof requestAnimationFrame === "undefined") {
      setDisplay(value);
      return undefined;
    }
    let frame;
    const start = Date.now();
    const step = () => {
      const k = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - (1 - k) ** 3;
      setDisplay(Math.round(from + (value - from) * eased));
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, id, reduced, duration]);

  return <Text style={style}>{display}</Text>;
}
