import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";

// The app coming back on screen. A home-screen web app can sit in the phone's memory for
// days, so what was loaded once (today's plan, badges, the dictionary, the announcement)
// is refreshed when it returns, rather than only when it is opened from scratch.

export const HOUR = 3600 * 1000;

const listeners = new Set();
let hiddenAt = null;
let started = false;

function resumed() {
  const away = hiddenAt ? Date.now() - hiddenAt : 0;
  hiddenAt = null;
  listeners.forEach((fn) => fn(away));
}

function start() {
  if (started) return;
  started = true;
  if (Platform.OS === "web") {
    if (typeof document === "undefined") return;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") hiddenAt ??= Date.now();
      else resumed();
    });
    // Restored from the browser's back-forward cache: as good as coming back.
    window.addEventListener("pageshow", (e) => e.persisted && resumed());
  } else {
    AppState.addEventListener("change", (state) => {
      if (state === "active") resumed();
      else hiddenAt ??= Date.now();
    });
  }
}

// Calls fn(msAway) each time the app comes back on screen. Returns the unsubscribe.
export function onResume(fn) {
  start();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const startOfDay = (time) => {
  const d = new Date(time);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// The time "now" as state: set when the screen first renders, then again at each local
// midnight and each time the app comes back on screen. Kept in state (not read during
// render) so the compiler's caching can't freeze it: anything computed from it updates.
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer;
    const schedule = () => {
      clearTimeout(timer);
      // The next local midnight by the calendar (a day is 23 or 25 hours when clocks change).
      const next = new Date();
      next.setHours(24, 0, 1, 0);
      timer = setTimeout(() => {
        setNow(Date.now());
        schedule();
      }, Math.max(1000, next.getTime() - Date.now()));
    };
    schedule();
    const off = onResume(() => {
      setNow(Date.now());
      schedule();
    });
    return () => {
      clearTimeout(timer);
      off();
    };
  }, []);
  return now;
}

// The current day (local midnight), changing at midnight while open, or on coming
// back the next day.
export function useCurrentDay() {
  return startOfDay(useNow());
}
