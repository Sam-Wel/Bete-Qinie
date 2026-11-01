import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabaseClient";
import { applyAnswer, markSaved, markUnsaved, mergeStats, rowFromStat, statFromRow, withDue } from "../lib/verbQuiz";

const TABLE = "word_progress";
const GAME_TYPE = "verb_quiz";
const DEVICE_KEY = "bete-qinie:verb-quiz:v1"; // kept from before the merge so guests keep their progress
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
      console.error("Error saving word progress on this device:", err);
    }
    return next;
  });
  return deviceQueue;
}

const normalize = (stats) => Object.fromEntries(Object.entries(stats).map(([id, s]) => [id, withDue(s)]));

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
    const { data, error } = await supabase.from(TABLE).select("*").eq("user_id", userId).range(from, from + 999);
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
    stats: normalize(stats),
    runs: sessions.filter((s) => s.status === "completed").map(runFromSession),
    inProgress: [...sessions].reverse().find((s) => s.status === "in_progress") ?? null,
  };
}

const WordProgressContext = createContext(null);

// One progress record per word, shared by ግሲ ፈተና, the games and ክለሳ, so an
// answer anywhere moves the same record and its next review date. Signed in,
// it lives in Supabase (word_progress) and follows the learner between devices;
// otherwise (or before supabase/word_progress.sql has been run) it stays on this
// device, and folds into the account at sign-in.
export function WordProgressProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [stats, setStats] = useState({});
  const [runs, setRuns] = useState([]);
  const [mode, setMode] = useState(null); // "account" | "device"
  const [ready, setReady] = useState(false);

  const statsRef = useRef({});
  const modeRef = useRef(null);
  const dirty = useRef(new Set());
  const sessionId = useRef(null);
  const queue = useRef(Promise.resolve());

  // Supabase writes go one at a time so an in-progress row is never inserted twice.
  const enqueue = useCallback((task) => {
    queue.current = queue.current.then(task).catch((err) => console.error("Word progress save failed:", err));
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
            merged = mergeStats(account.stats, normalize(device.stats));
            if (guestIds.length) {
              const { error } = await supabase
                .from(TABLE)
                .upsert(guestIds.map((id) => rowFromStat(userId, id, merged[id])), { onConflict: "user_id,word_id" });
              if (error) throw error;
            }
            if (device.runs.length) {
              const { error } = await supabase.from("game_sessions").insert(device.runs.map((run) => sessionFromRun(userId, run)));
              if (error) throw error;
              allRuns = [...account.runs, ...device.runs].sort((a, b) => a.at - b.at);
            }
            await writeDevice({ stats: {}, runs: [] });
          }

          if (cancelled) return;
          sessionId.current = account.inProgress?.id ?? null;
          modeRef.current = "account";
          setAllStats(merged);
          setRuns(allRuns);
          setMode("account");
          setReady(true);
          return;
        } catch (err) {
          // Most likely supabase/word_progress.sql hasn't been run yet: keep going on the device.
          console.warn("Account word progress unavailable, using this device:", err?.message || err);
        }
      }

      if (cancelled) return;
      modeRef.current = "device";
      setAllStats(normalize(device.stats));
      setRuns(device.runs);
      setMode("device");
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const flush = useCallback(() => {
    if (modeRef.current !== "account" || !dirty.current.size) return queue.current;
    const ids = [...dirty.current];
    dirty.current = new Set();
    return enqueue(async () => {
      const { error } = await supabase
        .from(TABLE)
        .upsert(ids.map((id) => rowFromStat(userId, id, statsRef.current[id])), { onConflict: "user_id,word_id" });
      if (error) {
        ids.forEach((id) => dirty.current.add(id));
        throw error;
      }
    });
  }, [userId, enqueue]);

  // Answers are sent in small batches; send what's left when the page is hidden.
  useEffect(() => {
    if (Platform.OS !== "web") return undefined;
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [flush]);

  // Change one or more records and store them where they live.
  const update = useCallback(
    (changes, { now: flushNow = false } = {}) => {
      const next = { ...statsRef.current, ...changes };
      setAllStats(next);
      if (modeRef.current === "account") {
        Object.keys(changes).forEach((id) => dirty.current.add(String(id)));
        if (flushNow || dirty.current.size >= FLUSH_EVERY) flush();
      } else {
        writeDevice({ stats: next });
      }
    },
    [flush]
  );

  const recordAnswer = useCallback(
    (wordId, correct) => update({ [wordId]: applyAnswer(statsRef.current[wordId], correct) }),
    [update]
  );

  const save = useCallback(
    (wordIds) =>
      update(Object.fromEntries([].concat(wordIds).map((id) => [id, markSaved(statsRef.current[id])])), { now: true }),
    [update]
  );

  const unsave = useCallback((wordId) => update({ [wordId]: markUnsaved(statsRef.current[wordId]) }, { now: true }), [update]);

  const isSaved = useCallback((wordId) => Boolean(statsRef.current[wordId]?.saved), []);

  // The quiz as it stands, so it can be picked up again after leaving the page.
  const saveInProgress = useCallback(
    (state) => {
      if (modeRef.current !== "account") return writeDevice({ inProgress: state });
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
    [userId, enqueue]
  );

  const loadInProgress = useCallback(async () => {
    const device = await readDevice();
    if (device.inProgress) return device.inProgress;
    if (modeRef.current !== "account" || !sessionId.current) return null;
    const { data } = await supabase.from("game_sessions").select("state").eq("id", sessionId.current).maybeSingle();
    return data?.state?.questions ? data.state : null;
  }, []);

  const discardInProgress = useCallback(async () => {
    await writeDevice({ inProgress: null });
    if (modeRef.current === "account" && sessionId.current) {
      const id = sessionId.current;
      sessionId.current = null;
      await enqueue(async () => {
        await supabase.from("game_sessions").delete().eq("id", id);
      });
    }
  }, [enqueue]);

  const finishRun = useCallback(
    async (run) => {
      setRuns((list) => [...list, run]);

      if (modeRef.current !== "account") {
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
          ? await supabase.from("game_sessions").update({ ...completed, created_at: undefined }).eq("id", id)
          : await supabase.from("game_sessions").insert(completed);
        if (error) throw error;
      });
    },
    [userId, flush, enqueue]
  );

  const value = useMemo(
    () => ({
      ready,
      mode,
      signedIn: Boolean(userId),
      stats,
      runs,
      recordAnswer,
      save,
      unsave,
      isSaved,
      flush,
      saveInProgress,
      loadInProgress,
      discardInProgress,
      finishRun,
    }),
    [ready, mode, userId, stats, runs, recordAnswer, save, unsave, isSaved, flush, saveInProgress, loadInProgress, discardInProgress, finishRun]
  );

  return <WordProgressContext.Provider value={value}>{children}</WordProgressContext.Provider>;
}

export function useWordProgress() {
  const value = useContext(WordProgressContext);
  if (!value) throw new Error("useWordProgress must be used inside <WordProgressProvider>");
  return value;
}
