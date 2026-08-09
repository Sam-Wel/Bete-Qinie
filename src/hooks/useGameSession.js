import { useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

// Supabase-backed save/resume for game progress, generalized over
// `gameType` so future games can reuse this as-is -- they just pick
// their own gameType string and shape their own `state` payload.
export function useGameSession(gameType) {
  const { user } = useAuth();
  const sessionIdRef = useRef(null);

  const loadInProgress = useCallback(async () => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("game_type", gameType)
      .eq("status", "in_progress")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error loading game session:", error);
      return null;
    }

    if (data) sessionIdRef.current = data.id;
    return data;
  }, [user, gameType]);

  const save = useCallback(
    async ({ state, score, totalQuestions, status = "in_progress" }) => {
      if (!user) return;

      const payload = {
        user_id: user.id,
        game_type: gameType,
        status,
        score,
        total_questions: totalQuestions,
        state,
        updated_at: new Date().toISOString(),
      };

      if (sessionIdRef.current) {
        const { error } = await supabase
          .from("game_sessions")
          .update(payload)
          .eq("id", sessionIdRef.current);
        if (error) console.error("Error updating game session:", error);
      } else {
        const { data, error } = await supabase
          .from("game_sessions")
          .insert(payload)
          .select()
          .single();
        if (error) {
          console.error("Error creating game session:", error);
        } else {
          sessionIdRef.current = data.id;
        }
      }

      if (status === "completed") {
        sessionIdRef.current = null;
      }
    },
    [user, gameType]
  );

  const clearSession = useCallback(() => {
    sessionIdRef.current = null;
  }, []);

  return { loadInProgress, save, clearSession, isSignedIn: !!user };
}
