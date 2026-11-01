import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer, ScreenHeader } from "../../components/ui";
import { QuizSetup } from "../../components/verbQuiz/QuizSetup";
import { QuizPlay } from "../../components/verbQuiz/QuizPlay";
import { QuizResults } from "../../components/verbQuiz/QuizResults";
import { QuizProgress } from "../../components/verbQuiz/QuizProgress";
import { useVerbBank } from "../../hooks/useVerbBank";
import { useVerbProgress } from "../../hooks/useVerbProgress";
import { buildQuiz, hasLanguage, pickWords, summarizeRun, wordsInScope } from "../../lib/verbQuiz";
import { colors, fontFamily, radii, shadows, spacing, typography } from "../../theme";

const SETTINGS_KEY = "bete-qinie:verb-quiz-settings:v1";

const DEFAULT_SETTINGS = {
  lang: "am",
  scope: { mode: "all", picks: {} },
  filter: "smart",
  count: 20,
  direction: "mixed",
  alsoShow: ["ti", "en"],
};

const TABS = [
  { key: "practice", label: "ልምምድ" },
  { key: "progress", label: "ዕቤት" },
];

function TabSwitch({ value, onChange }) {
  return (
    <View style={styles.tabs}>
      {TABS.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={[styles.tab, active && styles.tabActive]}>
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const newQuiz = (questions, settings) => ({
  settings,
  questions,
  index: 0,
  answers: [],
  retry: null,
  startedAt: Date.now(),
});

export default function VerbQuiz() {
  const { bank, loading, error } = useVerbBank();
  const progress = useVerbProgress();

  const [tab, setTab] = useState("practice");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [quiz, setQuiz] = useState(null);
  const [result, setResult] = useState(null);
  const [paused, setPaused] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY)
      .then((raw) => raw && setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }))
      .catch(() => {});
  }, []);

  const changeSettings = useCallback((patch) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const { ready, loadInProgress } = progress;
  useEffect(() => {
    if (!ready || quiz) return;
    loadInProgress().then(setPaused);
  }, [ready, quiz, result, loadInProgress]);

  const startWith = (words, overrides = {}) => {
    const used = { ...settings, ...overrides };
    if (!words.length) return;
    setResult(null);
    setPaused(null);
    setTab("practice");
    setQuiz(newQuiz(buildQuiz(words, used.lang, used.direction, bank), used));
  };

  const start = () => {
    const pool = wordsInScope(bank, settings.scope, settings.lang);
    startWith(pickWords(pool, progress.stats, settings.filter, settings.count));
  };

  // Only words that have a meaning in the answer language can be asked.
  const practiseWords = (ids) =>
    startWith(
      ids.map((id) => bank.byId[id]).filter((entry) => entry && hasLanguage(entry, settings.lang)),
      { filter: "all" }
    );

  // Another screen (a game's "practise the missed") can hand over words to quiz on.
  const { words: handedOver } = useLocalSearchParams();
  useEffect(() => {
    if (!handedOver || !bank || !progress.ready) return;
    practiseWords(String(handedOver).split(",").map(Number));
    router.setParams({ words: undefined });
  }, [handedOver, bank, progress.ready]);

  const practiseFamily = (familyId) => {
    changeSettings({ scope: { mode: "choose", picks: { [familyId]: "all" } }, filter: "smart" });
    setQuiz(null);
    setResult(null);
    setTab("practice");
  };

  const finish = async (done) => {
    const summary = summarizeRun(done.answers);
    const run = {
      at: Date.now(),
      ...summary,
      durationMs: Date.now() - done.startedAt,
      settings: { lang: done.settings.lang, direction: done.settings.direction, filter: done.settings.filter },
    };
    setQuiz(null);
    setResult({ run, quiz: done });
    await progress.finishRun(run);
  };

  const discardPaused = async () => {
    setPaused(null);
    await progress.discardInProgress();
  };

  let body;
  if (error) {
    body = <Text style={styles.error}>{error}</Text>;
  } else if (loading || !progress.ready) {
    body = <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />;
  } else if (tab === "progress") {
    body = (
      <QuizProgress
        bank={bank}
        stats={progress.stats}
        runs={progress.runs}
        lang={settings.lang}
        onPractiseFamily={practiseFamily}
        onPractiseWords={practiseWords}
      />
    );
  } else if (quiz) {
    body = (
      <QuizPlay
        quiz={quiz}
        bank={bank}
        onChange={(next) => {
          setQuiz(next);
          progress.saveInProgress(next);
        }}
        onFirstAnswer={progress.recordAnswer}
        onFinish={finish}
        onQuit={() => setQuiz(null)}
      />
    );
  } else if (result) {
    body = (
      <QuizResults
        run={result.run}
        quiz={result.quiz}
        bank={bank}
        onRetryMissed={() => practiseWords(result.run.missed)}
        onNewQuiz={() => setResult(null)}
        onProgress={() => setTab("progress")}
      />
    );
  } else {
    body = (
      <QuizSetup
        bank={bank}
        stats={progress.stats}
        settings={settings}
        onChange={changeSettings}
        onStart={start}
        paused={paused}
        onResume={() => {
          setResult(null);
          setQuiz(paused);
          setPaused(null);
        }}
        onDiscard={discardPaused}
        storageNote={
          progress.mode === "account"
            ? null
            : progress.signedIn
              ? "Progress is kept on this device for now."
              : "Progress is kept on this device. Sign in to keep it on your account and see it everywhere."
        }
      />
    );
  }

  return (
    <ScreenContainer scroll>
      <ScreenHeader title="ግሲ ፈተና" titleEthiopic />
      {/* A quiz in progress gets the screen to itself; Pause leads back out. */}
      {quiz && tab === "practice" ? null : <TabSwitch value={tab} onChange={setTab} />}
      {body}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    alignSelf: "flex-start",
    padding: 3,
    gap: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.lg,
  },
  tab: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.pill },
  tabActive: { backgroundColor: colors.surface, ...shadows.card },
  tabText: { fontFamily: fontFamily.ethiopicRegular, fontSize: 14, color: colors.textSecondary },
  tabTextActive: { fontFamily: fontFamily.ethiopicBold, color: colors.primary },
  error: { ...typography.body, color: colors.danger, marginTop: spacing.lg },
});
