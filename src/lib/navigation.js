// One map of the app's sections, read by the sidebar, the phone tabs, the More
// page and the page header, so names and grouping stay the same everywhere.

export const NAV_GROUPS = [
  {
    label: "LEARN",
    items: [
      { route: "index", href: "/", title: "መዝገበ ቃላት", english: "Dictionary", icon: "book-outline" },
      { route: "verb-roots", href: "/verb-roots", title: "ግሲ", english: "Verbs", icon: "list-outline" },
      { route: "meaqeni", href: "/meaqeni", title: "መዐቀኒ", english: "Meters", icon: "grid-outline" },
      { route: "zema", href: "/zema", title: "ዜማ", english: "Chant", icon: "musical-notes-outline" },
    ],
  },
  {
    label: "PRACTISE",
    items: [
      { route: "today", href: "/today", title: "ዛሬ", english: "Today", icon: "today-outline", badge: "today" },
      { route: "review", href: "/review", title: "ክለሳ", english: "Review", icon: "refresh-outline" },
      { route: "verb-quiz", href: "/verb-quiz", title: "ግሲ ፈተና", english: "Quiz", icon: "quiz-outline" },
      { route: "game", href: "/game", title: "ጨዋታዎች", english: "Games", icon: "game-controller-outline" },
    ],
  },
  {
    label: "READ",
    items: [{ route: "blog", href: "/blog", title: "ቅኔ አበው", english: "Blog", icon: "newspaper-outline" }],
  },
];

// Phone bottom tabs; everything else is one tap away under More.
export const TABS = [
  { route: "index", href: "/", label: "መዝገበ", icon: "book-outline" },
  { route: "verb-roots", href: "/verb-roots", label: "ግሲ", icon: "list-outline" },
  { route: "today", href: "/today", label: "ዛሬ", icon: "today-outline", badge: "today" },
  { route: "game", href: "/game", label: "ጨዋታ", icon: "game-controller-outline" },
  { route: "more", href: "/more", label: "More", icon: "more-horizontal", latin: true },
];

const GAME = (title, english) => ({ title, english, parent: "game", backTo: "/game" });

// Pages that aren't sections themselves: games open from the Games hub.
const EXTRA_PAGES = {
  shooter: GAME("ቀስት"),
  kal: GAME("ቃል"),
  "memory-match": GAME("Memory Match"),
  "guess-action": GAME("Guess the Action"),
  unscramble: GAME("Unscramble the Verb"),
  lightning: GAME("Lightning Round"),
  "verb-sort": GAME("Sorting Challenge"),
  "boss-battle": GAME("Boss Battle"),
  heads: GAME("ርእስ", "Heads"),
  account: { title: "Account" },
  more: { title: "ቤተ ቅኔ", english: "Everything in the app" },
};

const SECTIONS = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items.map((item) => [item.route, { ...item, section: g.label }]))
);

// Header details for a drawer route: title, English name, section label, back target.
export function pageInfo(route) {
  if (SECTIONS[route]) return SECTIONS[route];
  const extra = EXTRA_PAGES[route];
  if (!extra) return { title: "" };
  const parent = extra.parent && SECTIONS[extra.parent];
  return { ...extra, section: parent ? parent.title : undefined };
}

// Which section a route belongs to, for highlighting the sidebar and tabs.
export function sectionOf(route) {
  return EXTRA_PAGES[route]?.parent || route;
}

export const isEthiopic = (text) => /[ሀ-፿]/.test(text || "");
