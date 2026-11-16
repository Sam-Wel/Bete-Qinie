import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabaseClient";
import { isActive } from "../lib/announcement";
import { HOUR, onResume } from "../lib/appResume";

const CLOSED_KEY = "bete-qinie:announcement-closed"; // the id of the last one this device closed

let loaded = null; // one read per app session (and per return after an hour), shared by every page that shows the banner
const listeners = new Set();
let watching = false;

function watchForNews() {
  if (watching) return;
  watching = true;
  onResume((away) => {
    if (away < HOUR) return;
    loaded = null;
    const next = loadOnce();
    listeners.forEach((fn) => next.then(fn));
  });
}

function loadOnce() {
  if (!loaded) {
    loaded = Promise.all([
      supabase
        .from("app_settings")
        .select("value")
        .eq("key", "announcement")
        .maybeSingle()
        .then(({ data, error }) => (error ? null : data?.value ?? null), () => null),
      AsyncStorage.getItem(CLOSED_KEY).catch(() => null),
    ]);
  }
  return loaded;
}

// The current announcement, unless it has ended or this device closed it.
// Before supabase/admin_tools.sql is run there is none.
export function useAnnouncement() {
  const [state, setState] = useState({ announcement: null, closed: null });

  useEffect(() => {
    let live = true;
    const show = ([announcement, closed]) => live && setState({ announcement, closed });
    loadOnce().then(show);
    listeners.add(show);
    watchForNews();
    return () => {
      live = false;
      listeners.delete(show);
    };
  }, []);

  const { announcement, closed } = state;
  const show = isActive(announcement) && announcement.id !== closed;
  const close = () => {
    if (!announcement) return;
    setState((s) => ({ ...s, closed: announcement.id }));
    loaded = loaded?.then(([a]) => [a, announcement.id]);
    AsyncStorage.setItem(CLOSED_KEY, announcement.id).catch(() => {});
  };
  return { announcement: show ? announcement : null, close };
}
