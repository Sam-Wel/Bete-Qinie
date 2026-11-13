// The "?" guide in each page's header: how to use that page, kept here so the pages
// themselves stay free of long instructions. Keyed by route name. Each guide is a few
// short points; edit freely.

const GAME_FOCUS = "WORDS: Today's words (what you're learning), Today's + ክለሳ, or Free play (any word, practice only).";

export const HELP = {
  index: {
    title: "Dictionary",
    points: [
      "Type a word in ግዕዝ, ትግርኛ, አማርኛ or English to find the ግዕዝ word and its meanings.",
      "For a verb, the card shows its head (ርእስ) and a ርባታ button that opens its forms.",
      "Save to ክለሳ puts a word into your reviews.",
    ],
  },
  "verb-roots": {
    title: "ግሲ · Verbs",
    points: [
      "Every verb, grouped by its last letter. Pick a letter, then a verb, to open its card.",
      "Use the filter to find a verb fast.",
    ],
  },
  today: {
    title: "ዛሬ · Today",
    points: [
      "Start here each day: first ክለሳ (your reviews), then today's new words.",
      "Learning a word: meet it, then answer about it both ways. It is learned after 3 right answers in 2 kinds of question. Games on today's words count too.",
      "The dots on a word show its right answers so far.",
      "Know a word already? Tap “I already know this” when it first appears: one hard question and it skips ahead.",
      "With many reviews waiting, new words pause and you get a day's share of reviews, not the whole pile.",
      "Change how many new words a day under the number at the top.",
    ],
  },
  review: {
    title: "ክለሳ · Review",
    points: [
      "Words come back just before you'd forget them: 1, 1, 3, 7, 21, 60 and 120 days.",
      "Say the meaning, then Show answer and pick: Didn't know (back tomorrow), Got it, or Easy (skips a step). Each button shows when the word will return.",
      "A word you still know after a break jumps to the wait that matches it.",
      "After the 3-week review a word is mastered.",
      "Saved words from the Dictionary or ግሲ are listed at the bottom.",
    ],
  },
  progress: {
    title: "እድገት · Progress",
    points: [
      "Verbs you know, from everything you do: ዛሬ, ክለሳ, games and quizzes.",
      "Known: right 3 times in its reviews. Mastered: passed the 3-week review.",
      "Reviews coming up shows how many words return each day this week.",
      "Practise these quizzes you on the words you miss most. Tap an ending to practise its words.",
    ],
  },
  "verb-quiz": {
    title: "ግሲ ፈተና · Quiz",
    points: [
      "Pick the verbs (all, or some ending groups), the language and how many questions, then start.",
      "Each tile shows your best score for that ending: a test to beat. It counts quizzes with at least 5 questions from that ending.",
      "At the end you see every answer, with the right one where you missed.",
      "You can pause a quiz and come back to it.",
    ],
  },
  game: {
    title: "ጨዋታዎች · Games",
    points: [
      "ቃል is a new puzzle every day.",
      "Arcade games are timed; calm games have no clock.",
      "Games start on today's words, so playing is studying. Free play lets you use any word (practice only).",
    ],
  },
  kal: { title: "ቃል", points: ["Guess today's three-letter verb in six tries.", "Colours tell you: right letter, right consonant in another vowel order, or a consonant that belongs elsewhere.", "A hint shows the meaning after two guesses."] },
  heads: {
    title: "ርእስ",
    points: [
      "Each verb follows one of 8 head verbs (አርእስት), and conjugates like it.",
      "Pick the head for the verb shown. The answer shows the book's mark and the head's pattern.",
      "Easy keeps look-alikes apart; Medium always pairs them (ቀተለ/ቀደሰ, ተንበለ/ማህረከ); Hard shows all 8.",
      "Practice only: it doesn't change ዛሬ or ክለሳ.",
    ],
  },
  shooter: { title: "ቀስት", points: ["Shoot the verb that matches the meaning before time runs out.", GAME_FOCUS] },
  lightning: { title: "Lightning Round", points: ["Tap the meaning of each verb as fast as you can.", "Right answers in a row build a combo for more points.", GAME_FOCUS] },
  "boss-battle": { title: "Boss Battle", points: ["Each right answer strikes the boss; a miss or a slow answer lets it strike back.", "Beat all four bosses.", GAME_FOCUS] },
  "memory-match": { title: "Memory Match", points: ["Turn two cards at a time and pair each verb with its meaning.", GAME_FOCUS] },
  "guess-action": { title: "Guess the Action", points: ["See a picture of an action and pick the verb for it.", GAME_FOCUS] },
  unscramble: { title: "Unscramble", points: ["Read the meaning and put the verb's letters back in order.", "A hint places the next letter.", GAME_FOCUS] },
  "verb-sort": { title: "Sorting", points: ["Drop each verb into the group its meaning belongs to.", GAME_FOCUS] },
  meaqeni: {
    title: "መዐቀኒ · Meters",
    points: ["Pick a kind of ቅኔ, then fill each line's parts to check it against the meter.", "The tables show the counts allowed for each line type."],
  },
  zema: { title: "ዜማ · Chant", points: ["Listen to a ቅኔ chanted.", "Tap a line to loop just that line while you learn it."] },
  blog: { title: "ቅኔ አበው", points: ["Classical ቅኔ to read. Open one to read it in full; some have a chanted recording in ዜማ."] },
  account: { title: "Account", points: ["Signed in, your progress is kept in your account and on every device."] },
  more: { title: "ቤተ ቅኔ", points: ["Every part of the app, your account, appearance, and About."] },
  about: { title: "About", points: ["What ቤተ ቅኔ is for, its version, and how to reach us."] },
};

export const helpFor = (route) => HELP[route] || null;
