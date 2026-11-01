import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const DEVICE_KEY = "bete-qinie:game-scores:v1";

async function readDevice() {
  try {
    return JSON.parse((await AsyncStorage.getItem(DEVICE_KEY)) || "{}");
  } catch {
    return {};
  }
}

// Best and last score for one game. Signed in, every finished game is a
// completed row in game_sessions (the table every game shares); otherwise
// the two numbers are kept on this device.
export function useGameScores(gameType) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [scores, setScores] = useState({ best: null, last: null, ready: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next = (await readDevice())[gameType] || { best: null, last: null };
      if (userId) {
        const [best, last] = await Promise.all(
          ["score", "updated_at"].map((column) =>
            supabase
              .from("game_sessions")
              .select("score")
              .eq("user_id", userId)
              .eq("game_type", gameType)
              .eq("status", "completed")
              .order(column, { ascending: false })
              .limit(1)
              .maybeSingle()
          )
        );
        if (!best.error && !last.error) {
          next = { best: best.data?.score ?? null, last: last.data?.score ?? null };
        }
      }
      if (!cancelled) setScores({ ...next, ready: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, gameType]);

  // Returns true when this game beat the previous best.
  const saveScore = useCallback(
    async ({ score, rounds, state }) => {
      const isBest = scores.best == null || score > scores.best;
      const next = { best: isBest ? score : scores.best, last: score };
      setScores({ ...next, ready: true });

      if (userId) {
        const { error } = await supabase.from("game_sessions").insert({
          user_id: userId,
          game_type: gameType,
          status: "completed",
          score,
          total_questions: rounds,
          state,
        });
        if (error) console.error("Error saving the game score:", error);
      } else {
        const device = await readDevice();
        try {
          await AsyncStorage.setItem(DEVICE_KEY, JSON.stringify({ ...device, [gameType]: next }));
        } catch (err) {
          console.error("Error saving the game score on this device:", err);
        }
      }
      return isBest && score > 0;
    },
    [scores.best, userId, gameType]
  );

  return { ...scores, saveScore };
}
