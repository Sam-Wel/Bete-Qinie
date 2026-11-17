// The design lab: motion pieces that can be tried on the live app before they are kept
// (there is no preview site). A device opts in by opening any page with ?lab=1 and out
// with ?lab=0; until then nothing of the lab shows. Choices stay on that device.
export const LAB_KEY = "bete-qinie:lab:v1";

export const LAB_PIECES = [
  { key: "opening", label: "Opening the book", note: "On a first visit the cover opens onto ቤተ ቅኔ, then the app." },
  { key: "pageTurn", label: "Page turn", note: "The next card in learning and ክለሳ turns in like a page." },
  { key: "inkTitles", label: "Ink-written titles", note: "A page's title is written in, as if by a reed pen." },
  { key: "goldTab", label: "Gold-leaf tab", note: "On phones, the tab highlight is gold leaf." },
  { key: "victoryLight", label: "Victory light", note: "Light rays behind the Boss Battle cross." },
];

export const LAB_OFF = Object.freeze({ on: false, pieces: Object.freeze({}) });

// What a device saved; anything unreadable or unknown counts as off.
export function parseLab(raw) {
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object") return LAB_OFF;
    const pieces = {};
    for (const p of LAB_PIECES) if (value.pieces?.[p.key] === true) pieces[p.key] = true;
    return { on: value.on === true, pieces };
  } catch {
    return LAB_OFF;
  }
}

// ?lab=1 turns the lab on, ?lab=0 off; any other address leaves it as it was.
export function labFromUrl(search, current) {
  const match = /[?&]lab=([01])(?:&|$)/.exec(search || "");
  if (!match) return current;
  return { ...current, on: match[1] === "1" };
}

export const pieceOn = (lab, key) => lab.on && lab.pieces[key] === true;
