import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_DAILY } from "../lib/daily";

// The daily plan's settings, shared by ዛሬ, ክለሳ and every game on this device:
// focus: "today" | "studying" | "free" — which words the games ask.
// size: new words a day. family: "auto" or a family id to learn first.
// override: the day the learner chose to add new words despite a backlog.
// keptPile: true once the learner chose to keep the old ክለሳ pile.
// welcomed: true once the learner closed the first-visit welcome on ዛሬ.
const KEY = "bete-qinie:study-plan:v1";
const DEFAULTS = { focus: "today", size: DEFAULT_DAILY, family: "auto", override: null, keptPile: false, welcomed: false };

let current = DEFAULTS;
let loaded = false;
const listeners = new Set();

function publish(next) {
  current = next;
  listeners.forEach((fn) => fn(next));
}

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(KEY)) || "{}");
    publish({ ...DEFAULTS, ...saved, loaded: true });
  } catch {
    publish({ ...current, loaded: true });
  }
}

export async function setStudyPlan(patch) {
  publish({ ...current, ...patch });
  try {
    const { loaded: _loaded, ...stored } = current;
    await AsyncStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // The choice still applies for this visit.
  }
}

export function useStudyPlan() {
  const [plan, setPlan] = useState(current);
  useEffect(() => {
    listeners.add(setPlan);
    load();
    setPlan(current);
    return () => listeners.delete(setPlan);
  }, []);
  return [plan, setStudyPlan];
}
