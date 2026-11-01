import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// The language meanings are shown in, shared by ግሲ ፈተና and every game. It is
// stored in the quiz's existing settings, so all of them keep agreeing, and a
// change in one screen reaches the others still open in the drawer.
const SETTINGS_KEY = "bete-qinie:verb-quiz-settings:v1";

let current = "am";
let loaded = false;
const listeners = new Set();

function publish(lang) {
  current = lang;
  listeners.forEach((fn) => fn(lang));
}

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(SETTINGS_KEY)) || "{}");
    if (saved.lang) publish(saved.lang);
  } catch {
    // Keep the default.
  }
}

export async function setGameLanguage(lang) {
  publish(lang);
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(SETTINGS_KEY)) || "{}");
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...saved, lang }));
  } catch {
    // The choice still applies for this visit.
  }
}

export function useGameLanguage() {
  const [lang, setLang] = useState(current);
  useEffect(() => {
    listeners.add(setLang);
    load();
    setLang(current);
    return () => listeners.delete(setLang);
  }, []);
  return [lang, setGameLanguage];
}
