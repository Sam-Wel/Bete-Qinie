// Readable names for game_sessions.game_type.
export const GAME_NAMES = {
  verb_quiz: "ግሲ ፈተና",
  kal: "ቃል",
  verb_heads: "ርእስ",
  verb_shooter: "ቀስት",
  verb_memory: "Memory Match",
  verb_guess_action: "Guess the Action",
  verb_unscramble: "Unscramble",
  verb_sort: "Sorting",
  verb_boss: "Boss Battle",
  verb_lightning: "Lightning Round",
};

export const gameName = (type) => GAME_NAMES[type] || type;
