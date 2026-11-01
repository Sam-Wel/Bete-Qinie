import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { applyAnswer, mergeStats, rowFromStat, statFromRow } from "../lib/verbQuiz";

const GAME_TYPE = "verb_quiz";
const DEVICE_KEY = "bete-qinie:verb-quiz:v1";
const FLUSH_EVERY = 5;
const EMPTY_DEVICE = { stats: {}, runs: [], inProgress: null };

async function readDevice() {
  try {
    return { ...EMPTY_DEVICE, ...JSON.parse((await AsyncStorage.getItem(DEVICE_KEY)) || "null") };
  } catch {
    return { ...EMPTY_DEVICE };
  }
}

// Writes go one after another: two read-modify-writes in flight at once (an
// answer and the in-progress quiz) would otherwise each undo the other's change.
let deviceQueue = Promise.resolve();

// patch is an object to merge in, or a function of the stored value.
function writeDevice(patch) {
  deviceQueue = deviceQueue.then(async () => {
    const current = await readDevice();
    const next = { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
    try {
      await AsyncStorage.setItem(DEVICE_KEY, JSON.stringify(next));
    } catch (err) {
      console.error("Error saving verb quiz progress on this device:", err);
    }
    return next;
  });
  return deviceQueue;
}

const runFromSession = (row) => ({
  at: Date.parse(row.updated_at || row.created_at),
  total: row.total_questions || 0,
  correct: row.score || 0,
  ...row.state,
});

const sessionFromRun = (userId, run) => ({
  user_id: userId,
  game_type: GAME_TYPE,
  status: "completed",
  score: run.correct,
  total_questions: run.total,
  state: { durationMs: run.durationMs, families: run.families, missed: run.missed, settings: run.settings },
  created_at: new Date(run.at).toISOString(),
  updated_at: new Date(run.at).toISOString(),
});

async function fetchAccount(userId) {
  const stats = {};
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("verb_quiz_word_stats")
      .select("*")
      .eq("user_id", userId)
      .range(from, from + 999);
    if (error) throw error;
    for (const row of data) stats[row.word_id] = statFromRow(row);
    if (data.length < 1000) break;
  }

  const { data: sessions, error } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("game_type", GAME_TYPE)
    .order("updated_at", { ascending: true })
    .limit(1000);
  if (error) throw error;

  return {
    stats,
    runs: sessions.filter((s) => s.status === "completed").map(runFromSession),
    inProgress: [...sessions].reverse().find((s) => s.status === "in_progress") ?? null,
  };
}

// Per-word progress and finished quizzes. Signed in, they live in Supabase and
// follow the learner between devices; otherwise (or before supabase/verb_quiz.sql
// has been run) they stay on this device, and fold into the account at sign-in.
export function useVerbProgress() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [stats, setStats] = useState({});
  const [runs, setRuns] = useState([]);
  const [mode, setMode] = useState(null); // "account" | "device"
  const [ready, setReady] = useState(false);

  const statsRef = useRef({});
  const dirty = useRef(new Set());
  const sessionId = useRef(null);
  const queue = useRef(Promise.resolve());

  // Supabase writes go one at a time so an in-progress row is never inserted twice.
  const enqueue = useCallback((task) => {
    queue.current = queue.current.then(task).catch((err) => console.error("Verb quiz save failed:", err));
    return queue.current;
  }, []);

  const setAllStats = (next) => {
    statsRef.current = next;
    setStats(next);
  };

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    dirty.current = new Set();
    sessionId.current = null;

    (async () => {
      const device = await readDevice();

      if (userId) {
        try {
          const account = await fetchAccount(userId);
          let merged = account.stats;
          let allRuns = account.runs;

          const guestIds = Object.keys(device.stats);
          if (guestIds.length || device.runs.length) {
            merged = mergeStats(account.stats, device.stats);
            if (guestIds.length) {
              const { error } = await supabase
                .from("verb_quiz_word_stats")
                .upsert(guestIds.map((id) => rowFromStat(userId, id, merged[id])), { onConflict: "user_id,word_id" });
              if (error) throw error;
            }
            if (device.runs.length) {
              const { error } = await supabase
                .from("game_sessions")
                .insert(device.runs.map((run) => sessionFromRun(userId, run)));
              if (error) throw error;
              allRuns = [...account.runs, ...device.runs].sort((a, b) => a.at - b.at);
            }
            await writeDevice({ stats: {}, runs: [] });
          }

          if (cancelled) return;
          sessionId.current = account.inProgress?.id ?? null;
          setAllStats(merged);
          setRuns(allRuns);
          setMode("account");
          setReady(true);
          return;
        } catch (err) {
          // Most likely supabase/verb_quiz.sql hasn't been run yet: keep going on the device.
          console.warn("Verb quiz account progress unavailable, using this device:", err?.message || err);
        }
      }

      if (cancelled) return;
      setAllStats(device.stats);
      setRuns(device.runs);
      setMode("device");
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const flush = useCallback(() => {
    if (mode !== "account" || !dirty.current.size) return queue.current;
    const ids = [...dirty.current];
    dirty.current = new Set();
    return enqueue(async () => {
      const { error } = await supabase
        .from("verb_quiz_word_stats")
        .upsert(ids.map((id) => rowFromStat(userId, id, statsRef.current[id])), { onConflict: "user_id,word_id" });
      if (error) {
        ids.forEach((id) => dirty.current.add(id));
        throw error;
      }
    });
  }, [mode, userId, enqueue]);

  useEffect(() => () => void flush(), [flush]);

  const recordAnswer = useCallback(
    (wordId, correct) => {
      const next = { ...statsRef.current, [wordId]: applyAnswer(statsRef.current[wordId], correct) };
      setAllStats(next);
      if (mode === "account") {
        dirty.current.add(String(wordId));
        if (dirty.current.size >= FLUSH_EVERY) flush();
      } else {
        writeDevice({ stats: next });
      }
    },
    [mode, flush]
  );

  // The quiz as it stands, so it can be picked up again after leaving the page.
  const saveInProgress = useCallback(
    (state) => {
      if (mode !== "account") return writeDevice({ inProgress: state });
      writeDevice({ inProgress: null }); // a quiz begun before signing in now lives on the account
      return enqueue(async () => {
        const payload = {
          user_id: userId,
          game_type: GAME_TYPE,
          status: "in_progress",
          score: state.answers.filter((a) => a.correct).length,
          total_questions: state.questions.length,
          state,
          updated_at: new Date().toISOString(),
        };
        if (sessionId.current) {
          const { error } = await supabase.from("game_sessions").update(payload).eq("id", sessionId.current);
          if (error) throw error;
        } else {
          const { data, error } = await supabase.from("game_sessions").insert(payload).select("id").single();
          if (error) throw error;
          sessionId.current = data.id;
        }
      });
    },
    [mode, userId, enqueue]
  );

  const loadInProgress = useCallback(async () => {
    const device = await readDevice();
    if (device.inProgress) return device.inProgress;
    if (mode !== "account" || !sessionId.current) return null;
    const { data } = await supabase.from("game_sessions").select("state").eq("id", sessionId.current).maybeSingle();
    return data?.state?.questions ? data.state : null;
  }, [mode]);

  const discardInProgress = useCallback(async () => {
    await writeDevice({ inProgress: null });
    if (mode === "account" && sessionId.current) {
      const id = sessionId.current;
      sessionId.current = null;
      await enqueue(async () => {
        await supabase.from("game_sessions").delete().eq("id", id);
      });
    }
  }, [mode, enqueue]);

  const finishRun = useCallback(
    async (run) => {
      setRuns((list) => [...list, run]);

      if (mode !== "account") {
        await writeDevice((device) => ({ runs: [...device.runs, run], inProgress: null }));
        return;
      }
      await writeDevice({ inProgress: null });

      flush();
      const completed = sessionFromRun(userId, run);
      const id = sessionId.current;
      sessionId.current = null;
      await enqueue(async () => {
        const { error } = id
          ? await supabase
              .from("game_sessions")
              .update({ ...completed, created_at: undefined })
              .eq("id", id)
          : await supabase.from("game_sessions").insert(completed);
        if (error) throw error;
      });
    },
    [mode, userId, flush, enqueue]
  );

  return {
    ready,
    mode,
    signedIn: Boolean(userId),
    stats,
    runs,
    recordAnswer,
    saveInProgress,
    loadInProgress,
    discardInProgress,
    finishRun,
  };
}
