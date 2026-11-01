import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const GAME_TYPE = "kal";
const DEVICE_KEY = "bete-qinie:kal:v1";
const EMPTY = { daily: null, history: [] };

async function readDevice() {
  try {
    return { ...EMPTY, ...JSON.parse((await AsyncStorage.getItem(DEVICE_KEY)) || "null") };
  } catch {
    return { ...EMPTY };
  }
}

let deviceQueue = Promise.resolve();
function writeDevice(patch) {
  deviceQueue = deviceQueue.then(async () => {
    const next = { ...(await readDevice()), ...patch };
    try {
      await AsyncStorage.setItem(DEVICE_KEY, JSON.stringify(next));
    } catch (err) {
      console.error("Error saving ቃል on this device:", err);
    }
  });
  return deviceQueue;
}

const toRow = (userId, h) => ({
  user_id: userId,
  game_type: GAME_TYPE,
  status: "completed",
  score: h.won ? 7 - h.guesses : 0,
  total_questions: h.guesses,
  state: h,
});

// Today's board (kept on this device so a half-played puzzle survives a
// reload) and the record of finished daily puzzles, which lives on the
// account when signed in so the streak follows the player.
export function useKalHistory() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [history, setHistory] = useState([]);
  const [daily, setDaily] = useState(null);
  const [ready, setReady] = useState(false);
  const historyRef = useRef([]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    (async () => {
      const device = await readDevice();
      let list = device.history;
      if (userId) {
        const { data, error } = await supabase
          .from("game_sessions")
          .select("state")
          .eq("user_id", userId)
          .eq("game_type", GAME_TYPE)
          .eq("status", "completed")
          .limit(2000);
        if (!error) {
          const account = (data || []).map((r) => r.state).filter((s) => s?.date);
          // Days played before signing in move onto the account.
          const fresh = device.history.filter((h) => !account.some((a) => a.date === h.date));
          if (fresh.length) await supabase.from("game_sessions").insert(fresh.map((h) => toRow(userId, h)));
          await writeDevice({ history: [] });
          list = [...account, ...fresh];
        }
      }
      if (cancelled) return;
      historyRef.current = list;
      setHistory(list);
      setDaily(device.daily);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const saveDaily = useCallback((state) => {
    setDaily(state);
    writeDevice({ daily: state });
  }, []);

  // A finished daily puzzle: one entry per date.
  const finishDaily = useCallback(
    async (entry) => {
      if (historyRef.current.some((h) => h.date === entry.date)) return;
      const next = [...historyRef.current, entry];
      historyRef.current = next;
      setHistory(next);
      if (userId) {
        const { error } = await supabase.from("game_sessions").insert(toRow(userId, entry));
        if (error) console.error("Error saving the ቃል result:", error);
      } else {
        await writeDevice({ history: next });
      }
    },
    [userId]
  );

  return { ready, history, daily, saveDaily, finishDaily };
}
