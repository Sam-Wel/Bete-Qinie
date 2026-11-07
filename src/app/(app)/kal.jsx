import { useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { ScreenContainer, Button } from "../../components/ui";
import { KalBoard, KalLegend, MARK_COLORS, consonantsOf } from "../../components/games/KalBoard";
import { KalRootBoard, KalRootLegend } from "../../components/games/KalRootBoard";
import { Meanings } from "../../components/verbQuiz/QuizPlay";
import { shared, scriptFont } from "../../components/verbQuiz/shared";
import { useVerbBank } from "../../hooks/useVerbBank";
import { useKalHistory } from "../../hooks/useKalHistory";
import { useGameLanguage } from "../../hooks/useGameLanguage";
import { useWordProgress } from "../../context/WordProgressContext";
import {
  DAILY_VERSION,
  HINTS,
  MAX_GUESSES,
  checkGuess,
  consonantBase,
  dailyPuzzles,
  dailyWord,
  dateKey,
  easyChoices,
  guessSet,
  possibleRoots,
  practiceWord,
  puzzleWords,
  revealPosition,
  rootIndex,
  rootKey,
  rootOf,
  rootShareText,
  sameRoot,
  stars,
  stats as kalStats,
} from "../../lib/kal";
import { LANGUAGES, LANGUAGE_LABEL } from "../../lib/verbQuiz";
import { colors, fontFamily, radii, shadows, spacing, typography } from "../../theme";

const LEVELS = [
  { key: "easy", label: "Easy", line: "Six consonants to choose from in each square" },
  { key: "root", label: "Root", line: "Guess the three consonants" },
  { key: "full", label: "Full spelling", line: "Guess every letter with its vowel (hard)" },
];

function untilTomorrow(now = Date.now()) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const mins = Math.max(0, Math.round((next - now) / 60000));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Distribution({ distribution, highlight }) {
  const max = Math.max(1, ...distribution);
  return (
    <View style={styles.dist}>
      {distribution.map((count, i) => (
        <View key={i} style={styles.distRow}>
          <Text style={styles.distLabel}>{i + 1}</Text>
          <View style={styles.distTrack}>
            <View
              style={[
                styles.distBar,
                { width: `${Math.max(8, (count / max) * 100)}%` },
                highlight === i + 1 && { backgroundColor: MARK_COLORS.exact },
              ]}
            >
              <Text style={styles.distCount}>{count}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const Stars = ({ count }) => <Text style={styles.stars}>{"★".repeat(count) + "☆".repeat(3 - count)}</Text>;

// The meaning shown by the second rung: the game language if it isn't English,
// otherwise Amharic, then Tigrinya.
function otherLanguage(target, lang) {
  const order = lang !== "en" ? [lang, "am", "ti"] : ["am", "ti"];
  return order.find((c) => target.tr[c]?.length);
}

function HintLadder({ target, lang, playing, rungs, done, possibleWords, onTake }) {
  const used = playing.hints;
  const next = rungs[used];
  const other = otherLanguage(target, lang);
  const content = (kind) => {
    if (kind === "english") return { label: "English", text: target.tr.en.slice(0, 3).join(", ") };
    if (kind === "other") return { label: LANGUAGE_LABEL[other], text: target.tr[other].slice(0, 3).join("፣ ") };
    if (kind === "letter") {
      const pos = playing.reveal;
      return { label: "Consonant", text: pos == null ? "You already have them all." : `Square ${pos + 1} is ${consonantBase(rootOf(target.word)[pos])}` };
    }
    return { label: "Verbs that fit", text: possibleWords.slice(0, 40).join("  ·  ") };
  };

  return (
    <View style={styles.hints}>
      {rungs.slice(0, used).map((rung) => {
        const { label, text } = content(rung.kind);
        return (
          <View key={rung.kind} style={styles.hintRow}>
            <Text style={styles.hintLabel}>{label}</Text>
            <Text style={[styles.hintText, scriptFont(text)]}>{text}</Text>
          </View>
        );
      })}
      {!done && next ? (
        playing.guesses.length >= next.after ? (
          <Pressable onPress={onTake} style={({ hovered }) => [styles.hintButton, hovered && styles.hintButtonHover]}>
            <Text style={styles.hintButtonText}>
              Hint {used + 1} of {rungs.length}: {next.label}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.hintMuted}>
            Hint {used + 1} ({next.label}) opens after {next.after} {next.after === 1 ? "guess" : "guesses"}
          </Text>
        )
      ) : null}
    </View>
  );
}

// ቃል: find the day's three-letter Ge'ez verb by its root in six tries. The
// ending is given, a ladder of hints helps, and Practice has Easy, Root and
// the original full-spelling game.
export default function Kal() {
  const { bank, loading, error } = useVerbBank();
  const progress = useWordProgress();
  const kal = useKalHistory();
  const [lang] = useGameLanguage();
  const [mode, setMode] = useState("daily");
  const [practice, setPractice] = useState(null); // { level, target, guesses, hints, reveal }
  const [copied, setCopied] = useState(false);
  const narrow = useWindowDimensions().width < 760;

  const puzzles = useMemo(() => (bank ? puzzleWords(bank) : []), [bank]);
  const dailyPool = useMemo(() => (bank ? dailyPuzzles(bank) : []), [bank]);
  const allowed = useMemo(() => (bank ? guessSet(bank) : new Set()), [bank]);
  const roots = useMemo(() => (bank ? rootIndex(bank) : new Map()), [bank]);
  const rootList = useMemo(() => [...roots.keys()].map((k) => k.split(".").map(Number)), [roots]);
  const consonants = useMemo(() => consonantsOf([...allowed]), [allowed]);
  const today = dateKey();
  const dailyTarget = useMemo(() => dailyWord(dailyPool), [dailyPool]);

  if (error) {
    return (
      <ScreenContainer>
        <Text style={{ ...typography.body, color: colors.danger }}>{error}</Text>
      </ScreenContainer>
    );
  }
  if (loading || !kal.ready || !progress.ready || !dailyTarget) {
    return (
      <ScreenContainer center>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  const fresh = (level, target) => ({ level, target, guesses: [], hints: 0, reveal: null });
  const newPractice = (level = practice?.level || "root") => fresh(level, practiceWord(puzzles, progress.stats));

  const savedDaily = kal.daily?.date === today && kal.daily?.v === DAILY_VERSION ? kal.daily : null;
  const playing =
    mode === "daily"
      ? { level: "root", target: dailyTarget, guesses: savedDaily?.guesses || [], hints: savedDaily?.hints || 0, reveal: savedDaily?.reveal ?? null }
      : practice ?? newPractice();
  const { target, level } = playing;
  const byRoot = level !== "full";
  const targetRoot = rootOf(target.word);

  const fixed = byRoot ? { 2: targetRoot[2], ...(playing.reveal != null ? { [playing.reveal]: targetRoot[playing.reveal] } : {}) } : {};
  const won = byRoot ? playing.guesses.some((g) => sameRoot(g, targetRoot)) : playing.guesses.includes(target.word);
  const done = won || playing.guesses.length >= MAX_GUESSES;
  const rungs = byRoot ? HINTS : HINTS.slice(0, 2);

  const possible = byRoot ? possibleRoots(rootList, playing.guesses, targetRoot, fixed) : [];
  const possibleWords = possible.flatMap((r) => roots.get(rootKey(r)) || []);
  const choices = level === "easy" ? easyChoices(targetRoot, rootList, fixed, target.id) : null;

  const update = (patch) => {
    if (mode === "daily") kal.saveDaily({ date: today, v: DAILY_VERSION, guesses: playing.guesses, hints: playing.hints, reveal: playing.reveal, ...patch });
    else setPractice({ ...playing, ...patch });
  };

  const submit = (guess) => {
    const guesses = [...playing.guesses, guess];
    update({ guesses });
    const nowWon = byRoot ? sameRoot(guess, targetRoot) : guess === target.word;
    if (nowWon || guesses.length >= MAX_GUESSES) {
      progress.recordAnswer(target.id, nowWon, { kind: "kal" });
      if (mode === "daily") {
        kal.finishDaily({ date: today, won: nowWon, guesses: guesses.length, hint: playing.hints > 0, hints: playing.hints, wordId: target.id });
      }
    }
  };

  const takeHint = () => {
    const rung = rungs[playing.hints];
    const patch = { hints: playing.hints + 1 };
    if (rung.kind === "letter") patch.reveal = revealPosition(targetRoot, playing.guesses, fixed);
    update(patch);
  };

  const share = async () => {
    const text = rootShareText({ date: today, guesses: playing.guesses, target: targetRoot, won, hints: playing.hints });
    try {
      if (Platform.OS === "web" && !navigator.share) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } else {
        await Share.share({ message: text });
      }
    } catch {
      // Cancelled or not allowed; nothing to do.
    }
  };

  const st = kalStats(kal.history, today);
  const saved = Boolean(progress.stats[target.id]?.saved);
  const ending = consonantBase(targetRoot[2]);

  return (
    <ScreenContainer scroll keyboardAvoiding>
      <View style={[styles.modes, narrow && styles.modesCompact]}>
        {[
          ["daily", `Today's ቃል`],
          ["practice", "Practice"],
        ].map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => {
              setMode(key);
              if (key === "practice" && !practice) setPractice(newPractice());
            }}
            style={[styles.mode, mode === key && styles.modeActive]}
          >
            <Text style={[styles.modeText, mode === key && styles.modeTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {mode === "practice" ? (
        <View style={styles.levels}>
          {LEVELS.map((l) => (
            <Pressable
              key={l.key}
              onPress={() => setPractice(fresh(l.key, practice?.target ?? practiceWord(puzzles, progress.stats)))}
              accessibilityRole="button"
              accessibilityState={{ selected: level === l.key }}
              style={({ hovered }) => [styles.level, level === l.key && styles.levelOn, hovered && level !== l.key && styles.levelHover]}
            >
              <Text style={[styles.levelText, level === l.key && styles.levelTextOn]}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={styles.lead}>
        {byRoot ? (
          <>
            A three-letter ግዕዝ verb ending in <Text style={styles.leadLetter}>{ending}</Text>. Find its root: the consonants, not the vowels.
          </>
        ) : (
          "A three-letter ግዕዝ verb. Guess every letter, vowels included."
        )}
      </Text>

      {byRoot && !done && playing.guesses.length ? (
        <Text style={styles.possible}>
          {possible.length === 1 ? "1 verb still fits" : `${possible.length} verbs still fit`}
        </Text>
      ) : null}

      {byRoot ? (
        <KalRootBoard
          target={targetRoot}
          guesses={playing.guesses}
          fixed={done ? {} : fixed}
          consonants={consonants}
          choices={choices}
          done={done}
          onSubmit={submit}
          check={(root) => (roots.has(rootKey(root)) ? null : "No verb in the dictionary has this root.")}
        />
      ) : (
        <KalBoard
          target={target.word}
          guesses={playing.guesses}
          allowedConsonants={consonants}
          done={done}
          onSubmit={submit}
          check={(guess) => checkGuess(guess, allowed)}
        />
      )}

      <HintLadder
        target={target}
        lang={lang}
        playing={playing}
        rungs={rungs}
        done={done}
        possibleWords={possibleWords}
        onTake={takeHint}
      />

      {done ? (
        <View style={[shared.card, styles.result]}>
          <Text style={[styles.resultKicker, { color: won ? MARK_COLORS.exact : colors.accent }]}>
            {won ? ["Brilliant!", "Excellent!", "Very good!", "Good!", "Well done!", "Just made it!"][playing.guesses.length - 1] : "Not this time"}
          </Text>
          {won ? <Stars count={stars(playing.hints)} /> : null}
          <Text style={styles.resultWord}>{target.word}</Text>
          {byRoot ? (
            <Text style={styles.resultRoot}>
              root {targetRoot.map(consonantBase).join(" · ")}
            </Text>
          ) : null}
          <Meanings entry={target} langs={[lang, ...LANGUAGES.map((l) => l.code).filter((c) => c !== lang)]} />
          <View style={styles.resultActions}>
            {mode === "daily" ? (
              <Button size="sm" onPress={share}>
                {copied ? "Copied ✓" : "Share result"}
              </Button>
            ) : (
              <Button size="sm" onPress={() => setPractice(newPractice(level))}>
                Another word
              </Button>
            )}
            <Button size="sm" variant="secondary" disabled={saved} onPress={() => progress.save([target.id])}>
              {saved ? "In ክለሳ ✓" : "Save to ክለሳ"}
            </Button>
            {mode === "daily" ? (
              <Button
                size="sm"
                variant="ghost"
                onPress={() => {
                  setMode("practice");
                  setPractice(newPractice());
                }}
              >
                Play a practice word
              </Button>
            ) : null}
          </View>
          {mode === "daily" ? <Text style={shared.muted}>Next ቃል in {untilTomorrow()}.</Text> : null}
        </View>
      ) : null}

      {mode === "daily" && (done || st.played) ? (
        <View style={[shared.card, styles.statsCard]}>
          <View style={styles.statsRow}>
            <Stat value={st.played} label="played" />
            <Stat value={st.winRate == null ? "—" : `${Math.round(st.winRate * 100)}%`} label="won" />
            <Stat value={st.current} label="streak" />
            <Stat value={st.best} label="best streak" />
          </View>
          {st.wins ? <Distribution distribution={st.distribution} highlight={won ? playing.guesses.length : null} /> : null}
        </View>
      ) : null}

      <View style={styles.legendWrap}>{byRoot ? <KalRootLegend /> : <KalLegend />}</View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  modes: {
    flexDirection: "row",
    alignSelf: "center",
    padding: 3,
    gap: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.md,
  },
  mode: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.pill },
  modesCompact: { marginBottom: spacing.sm },
  modeActive: { backgroundColor: colors.surface, ...shadows.card },
  modeText: { ...typography.label, color: colors.textSecondary },
  modeTextActive: { color: colors.primary },
  levels: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm, marginBottom: spacing.sm },
  level: { paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  levelOn: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  levelHover: { backgroundColor: colors.surfaceMuted },
  levelText: { ...typography.label, color: colors.textSecondary },
  levelTextOn: { color: colors.textPrimary },
  lead: { ...typography.caption, color: colors.textSecondary, textAlign: "center", marginBottom: spacing.xs, paddingHorizontal: spacing.md },
  leadLetter: { fontFamily: fontFamily.ethiopicBold, fontSize: 16, color: colors.primaryDark },
  possible: { ...typography.label, color: colors.primaryDark, textAlign: "center", marginBottom: spacing.xs },
  hints: { alignSelf: "center", width: "100%", maxWidth: 560, gap: spacing.sm, marginTop: spacing.md },
  hintRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "baseline",
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hintLabel: { ...typography.caption, fontFamily: fontFamily.latinSemiBold, color: colors.primaryDark, minWidth: 90 },
  hintText: { flex: 1, fontSize: 16, lineHeight: 24, color: colors.textPrimary },
  hintButton: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  hintButtonHover: { backgroundColor: colors.surfaceMuted },
  hintButtonText: { ...typography.label, color: colors.primaryDark },
  hintMuted: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
  result: { alignItems: "center", gap: spacing.sm, marginTop: spacing.lg },
  resultKicker: { ...typography.label, letterSpacing: 1, textTransform: "uppercase" },
  stars: { fontSize: 24, lineHeight: 30, color: "#e0a52a", letterSpacing: 4 },
  resultWord: { fontFamily: fontFamily.ethiopicBold, fontSize: 36, lineHeight: 48, color: colors.textPrimary },
  resultRoot: { ...typography.caption, fontFamily: fontFamily.ethiopicRegular, color: colors.textSecondary, marginTop: -6 },
  resultActions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm, marginTop: spacing.sm },
  statsCard: { marginTop: spacing.lg, gap: spacing.md },
  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  stat: { alignItems: "center" },
  statValue: { fontFamily: fontFamily.latinBold, fontSize: 24, lineHeight: 30, color: colors.textPrimary },
  statLabel: { ...typography.caption, color: colors.textMuted },
  dist: { gap: 4 },
  distRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  distLabel: { ...typography.label, color: colors.textSecondary, width: 12 },
  distTrack: { flex: 1 },
  distBar: { backgroundColor: MARK_COLORS.absent, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignItems: "flex-end" },
  distCount: { ...typography.caption, color: "#fff", fontFamily: fontFamily.latinSemiBold },
  legendWrap: { marginTop: spacing.xl, alignSelf: "center", maxWidth: 420 },
});
