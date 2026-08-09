import { useCallback, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Personal study lists with SM-2 spaced repetition (the same scheduling
// algorithm Anki/SuperMemo use), simplified to a binary "Got it" /
// "Didn't know it" response instead of a 0-5 quality scale.
export function useStudyList() {
  const { user } = useAuth();
  const [allItems, setAllItems] = useState([]);
  const [dueItems, setDueItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("study_items")
        .select("*")
        .eq("user_id", user.id)
        .order("next_review_date", { ascending: true });

      if (error) {
        console.error("Error loading study items:", error);
        setError("Failed to load your study list.");
        return;
      }

      const items = data || [];
      setAllItems(items);
      const today = todayISO();
      setDueItems(items.filter((item) => item.next_review_date <= today));
    } catch (err) {
      console.error("Unexpected error loading study items:", err);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveWord = useCallback(
    async (word, languageCode = "gz") => {
      if (!user || !word?.trim()) return;

      const { error } = await supabase.from("study_items").upsert(
        { user_id: user.id, word: word.trim(), language_code: languageCode },
        { onConflict: "user_id,word,language_code", ignoreDuplicates: true }
      );

      if (error) {
        console.error("Error saving word:", error);
        return;
      }

      await loadItems();
    },
    [user, loadItems]
  );

  const removeWord = useCallback(
    async (id) => {
      if (!user) return;
      const { error } = await supabase.from("study_items").delete().eq("id", id);
      if (error) {
        console.error("Error removing study item:", error);
        return;
      }
      await loadItems();
    },
    [user, loadItems]
  );

  const recordReview = useCallback(async (item, gotIt) => {
    let repetitions = item.repetitions;
    let intervalDays = item.interval_days;
    let easeFactor = item.ease_factor;

    if (gotIt) {
      repetitions += 1;
      if (repetitions === 1) intervalDays = 1;
      else if (repetitions === 2) intervalDays = 6;
      else intervalDays = Math.round(intervalDays * easeFactor);
    } else {
      repetitions = 0;
      intervalDays = 1;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

    const { error } = await supabase
      .from("study_items")
      .update({
        repetitions,
        interval_days: intervalDays,
        ease_factor: easeFactor,
        next_review_date: nextReviewDate.toISOString().slice(0, 10),
        last_reviewed_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      console.error("Error recording review:", error);
    }
  }, []);

  return {
    allItems,
    dueItems,
    loading,
    error,
    loadItems,
    saveWord,
    removeWord,
    recordReview,
    isSignedIn: !!user,
  };
}
