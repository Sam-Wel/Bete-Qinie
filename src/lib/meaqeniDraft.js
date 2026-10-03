import AsyncStorage from "@react-native-async-storage/async-storage";

// Bumped when the stored shape changes, so an old draft is ignored rather than restored
// into a checker that no longer understands it.
const KEY = "bete-qinie:meaqeni-draft:v1";

export async function loadDraft() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveDraft(draft) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Storage can be unavailable (private window, blocked site data). Losing the draft
    // is bad but breaking the page is worse.
  }
}

export async function clearDraft() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignored for the same reason
  }
}

// A draft is only safe to restore if it still lines up with the meter it was written
// against — same number of lines, same slot keys in each.
export function draftFits(draft, slotsByLine) {
  if (!draft?.state || !Array.isArray(draft.state)) return false;
  if (draft.state.length !== slotsByLine.length) return false;

  return slotsByLine.every((slots, line) => {
    const stored = draft.state[line];
    if (!stored?.slots || !Array.isArray(stored.parts)) return false;
    return slots.every((slot) => stored.slots[slot.key]);
  });
}

export function hasContent(draft) {
  return Boolean(
    draft?.title?.trim() ||
      draft?.state?.some((line) =>
        Object.values(line.slots ?? {}).some((value) => value?.type || value?.text || value?.skipped)
      )
  );
}
