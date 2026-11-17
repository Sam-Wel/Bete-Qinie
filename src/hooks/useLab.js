import { useSyncExternalStore } from "react";
import { LAB_KEY, LAB_OFF, labFromUrl, parseLab, pieceOn } from "../lib/lab";

// The design lab's switches for this device (see src/lib/lab.js). Off while a pre-built
// page hydrates, then read from storage and the address (?lab=1 / ?lab=0).
let state = LAB_OFF;
let loaded = false;
const listeners = new Set();

function save() {
  try {
    globalThis.localStorage?.setItem(LAB_KEY, JSON.stringify(state));
  } catch {
    // Private mode or blocked storage: the switches last until the page closes.
  }
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  let saved = LAB_OFF;
  try {
    saved = parseLab(globalThis.localStorage?.getItem(LAB_KEY));
  } catch {
    saved = LAB_OFF;
  }
  state = labFromUrl(window.location?.search, saved);
  if (state !== saved) save();
}

const notify = () => listeners.forEach((l) => l());
const subscribe = (listener) => {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const read = () => {
  load();
  return state;
};

export function setLabPiece(key, value) {
  state = { ...state, pieces: { ...state.pieces, [key]: value } };
  save();
  notify();
}

export function setLabOn(on) {
  state = { ...state, on };
  save();
  notify();
}

export function useLab() {
  return useSyncExternalStore(subscribe, read, () => LAB_OFF);
}

export function useLabPiece(key) {
  return pieceOn(useLab(), key);
}
