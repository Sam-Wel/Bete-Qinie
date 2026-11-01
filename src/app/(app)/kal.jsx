import { useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { ScreenContainer, ScreenHeader, Button, Icon } from "../../components/ui";
import { KalBoard, KalLegend, MARK_COLORS, consonantsOf } from "../../components/games/KalBoard";
import { Meanings } from "../../components/verbQuiz/QuizPlay";
import { shared, scriptFont } from "../../components/verbQuiz/shared";
import { useVerbBank } from "../../hooks/useVerbBank";
import { useKalHistory } from "../../hooks/useKalHistory";
import { useGameLanguage } from "../../hooks/useGameLanguage";
import { useWordProgress } from "../../context/WordProgressContext";
import {
  HINT_AFTER,
  MAX_GUESSES,
  checkGuess,
  dailyWord,
  dateKey,
  guessSet,
  puzzleWords,
  randomWord,
  shareText,
  stats as kalStats,
} from "../../lib/kal";
import { LANGUAGES, LANGUAGE_LABEL } from "../../lib/verbQuiz";
import { colors, fontFamily, radii, shadows, spacing, typography } from "../../theme";


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

// ቃል: guess the day's three-letter Ge'ez verb in six tries.
export default function Kal() {
  const { bank, loading, error } = useVerbBank();
  const progress = useWordProgress();
  const kal = useKalHistory();
  const [lang] = useGameLanguage();
  const [mode, setMode] = useState("daily");
  const [practice, setPractice] = useState(null); // { target, guesses, hint }
  const [copied, setCopied] = useState(false);
  // Phones get a one-line header so the board and keyboard fit on one screen.
  const narrow = useWindowDimensions().width < 760;

  const puzzles = useMemo(() => (bank ? puzzleWords(bank) : []), [bank]);
  const allowed = useMemo(() => (bank ? guessSet(bank) : new Set()), [bank]);
  const consonants = useMemo(() => consonantsOf([...allowed]), [allowed]);
  const today = dateKey();
  const dailyTarget = useMemo(() => dailyWord(puzzles), [puzzles]);

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

  const daily = kal.daily?.date === today ? kal.daily : { date: today, guesses: [], hint: false };
  const playing =
    mode === "daily"
      ? { target: dailyTarget, guesses: daily.guesses, hint: daily.hint }
      : practice ?? { target: randomWord(puzzles), guesses: [], hint: false };
  const { target } = playing;
  const won = playing.guesses.includes(target.word);
  const done = won || playing.guesses.length >= MAX_GUESSES;

  const update = (patch) => {
    if (mode === "daily") kal.saveDaily({ ...daily, ...patch });
    else setPractice({ ...playing, ...patch });
  };

  const submit = (guess) => {
    const guesses = [...playing.guesses, guess];
    update({ guesses });
    const nowWon = guess === target.word;
    if (nowWon || guesses.length >= MAX_GUESSES) {
      progress.recordAnswer(target.id, nowWon);
      if (mode === "daily") {
        kal.finishDaily({ date: today, won: nowWon, guesses: guesses.length, hint: playing.hint, wordId: target.id });
      }
    }
  };

  const hintLang = target.tr[lang]?.length ? lang : ["am", "en", "ti"].find((c) => target.tr[c].length);
  const hintText = target.tr[hintLang]?.slice(0, 3).join(" · ");

  const share = async () => {
    const text = shareText({ date: today, guesses: playing.guesses, target: target.word, won, hint: playing.hint });
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

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/game"));

  const modeSwitch = (
    <View style={[styles.modes, narrow && styles.modesCompact]}>
      {[
        ["daily", `Today's ቃል`],
        ["practice", "Practice"],
      ].map(([key, label]) => (
        <Pressable
          key={key}
          onPress={() => {
            setMode(key);
            if (key === "practice" && !practice) setPractice({ target: randomWord(puzzles), guesses: [], hint: false });
          }}
          style={[styles.mode, mode === key && styles.modeActive]}
        >
          <Text style={[styles.modeText, mode === key && styles.modeTextActive]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );

  const st = kalStats(kal.history, today);
  const saved = Boolean(progress.stats[target.id]?.saved);

  return (
    <ScreenContainer scroll keyboardAvoiding>
      {narrow ? (
        <View style={styles.compactHeader}>
          <Pressable onPress={goBack} hitSlop={10}>
            <Icon name="chevron-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.compactTitle}>ቃል</Text>
          {modeSwitch}
        </View>
      ) : (
        <>
          <ScreenHeader title="ቃል" titleEthiopic onBack={goBack} />
          {modeSwitch}
        </>
      )}

      <View style={styles.hintBar}>
        {playing.hint || done ? (
          <Text style={styles.hintText}>
            <Text style={styles.hintLang}>{LANGUAGE_LABEL[hintLang]}  </Text>
            <Text style={scriptFont(hintText)}>{hintText}</Text>
          </Text>
        ) : playing.guesses.length >= HINT_AFTER ? (
          <Pressable onPress={() => update({ hint: true })}>
            <Text style={styles.hintButton}>Stuck? Show the meaning</Text>
          </Pressable>
        ) : (
          <Text style={styles.hintMuted} numberOfLines={1}>
            {narrow ? "A three-letter ግዕዝ verb" : `A three-letter ግዕዝ verb · the meaning unlocks after ${HINT_AFTER} guesses`}
          </Text>
        )}
      </View>

      <KalBoard
        target={target.word}
        guesses={playing.guesses}
        allowedConsonants={consonants}
        done={done}
        onSubmit={submit}
        check={(guess) => checkGuess(guess, allowed)}
      />

      {done ? (
        <View style={[shared.card, styles.result]}>
          <Text style={[styles.resultKicker, { color: won ? MARK_COLORS.exact : colors.accent }]}>
            {won ? ["Brilliant!", "Excellent!", "Very good!", "Good!", "Well done!", "Just made it!"][playing.guesses.length - 1] : "Not this time"}
          </Text>
          <Text style={styles.resultWord}>{target.word}</Text>
          <Meanings entry={target} langs={[lang, ...LANGUAGES.map((l) => l.code).filter((c) => c !== lang)]} />
          <View style={styles.resultActions}>
            {mode === "daily" ? (
              <Button size="sm" onPress={share}>
                {copied ? "Copied ✓" : "Share result"}
              </Button>
            ) : (
              <Button size="sm" onPress={() => setPractice({ target: randomWord(puzzles), guesses: [], hint: false })}>
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
                  setPractice({ target: randomWord(puzzles), guesses: [], hint: false });
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

      <View style={styles.legendWrap}>
        <KalLegend />
      </View>
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
  compactHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  compactTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 22, lineHeight: 30, color: colors.textPrimary, flex: 1 },
  modesCompact: { marginBottom: 0 },
  modeActive: { backgroundColor: colors.surface, ...shadows.card },
  modeText: { ...typography.label, color: colors.textSecondary },
  modeTextActive: { color: colors.primary },
  hintBar: { minHeight: 26, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm, paddingHorizontal: spacing.md },
  hintText: { fontSize: 17, lineHeight: 24, color: colors.textPrimary, textAlign: "center" },
  hintLang: { fontFamily: fontFamily.ethiopicBold, fontSize: 12, color: colors.textMuted },
  hintButton: { ...typography.label, color: colors.primary, textDecorationLine: "underline" },
  hintMuted: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
  result: { alignItems: "center", gap: spacing.sm, marginTop: spacing.lg },
  resultKicker: { ...typography.label, letterSpacing: 1, textTransform: "uppercase" },
  resultWord: { fontFamily: fontFamily.ethiopicBold, fontSize: 36, lineHeight: 48, color: colors.textPrimary },
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
