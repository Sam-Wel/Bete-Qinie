import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabaseClient";
import { useGameSession } from "../../hooks/useGameSession";
import { ScreenContainer, Card, Button, ScreenHeader, Select } from "../../components/ui";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

const GAME_TYPE = "dictionary_quiz";

const SUFFIXES = [
  "ሐ", "ሀ", "ኀ", "ለ", "መ", "ሰ", "ሠ", "ረ", "ቀ", "በ",
  "ተ", "ነ", "ዐ", "አ", "ከ", "ወ", "ዘ", "የ", "ደ", "ገ",
  "ጠ", "ጰ", "ጸ", "ፀ", "ፈ", "ፐ",
];

const SUFFIX_ITEMS = SUFFIXES.map((letter) => ({ label: letter, value: letter }));

const LANGUAGE_ITEMS = [
  { label: "Tigrinya", value: "ti" },
  { label: "Amharic", value: "am" },
];

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

export default function Game() {
  const gameSession = useGameSession(GAME_TYPE);

  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [languageCode, setLanguageCode] = useState("ti");
  const [suffix, setSuffix] = useState("ሐ");
  const [geezWords, setGeezWords] = useState([]);
  const [translations, setTranslations] = useState([]);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [userAnswer, setUserAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [statusMessage, setStatusMessage] = useState(null);
  const [loadingGame, setLoadingGame] = useState(false);
  const [resumeSession, setResumeSession] = useState(null);
  const [checkingResume, setCheckingResume] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setCheckingResume(true);
    gameSession.loadInProgress().then((session) => {
      if (cancelled) return;
      setResumeSession(session);
      setCheckingResume(false);
    });
    return () => {
      cancelled = true;
    };
  }, [gameSession.loadInProgress]);

  const endGame = (finalScoreValue, totalQuestionsValue) => {
    setFinalScore(finalScoreValue);
    setGameOver(true);
    setGameStarted(false);
    setCurrentChallenge(null);
    setGeezWords([]);
    setTranslations([]);
    gameSession.save({
      state: {},
      score: finalScoreValue,
      totalQuestions: totalQuestionsValue,
      status: "completed",
    });
  };

  const loadChallenge = (index, geezWordsList, translationsList) => {
    const geezWord = geezWordsList[index];

    const currentTranslations = translationsList.filter(
      (t) => t.word_id === geezWord.word_id && t.words?.word
    );

    if (currentTranslations.length === 0) {
      const nextIndex = index + 1;
      if (nextIndex < geezWordsList.length) {
        setCurrentChallengeIndex(nextIndex);
        loadChallenge(nextIndex, geezWordsList, translationsList);
      } else {
        endGame(score, geezWordsList.length);
      }
      return;
    }

    const randomIndex = Math.floor(Math.random() * currentTranslations.length);
    const correctTranslation = currentTranslations[randomIndex]?.words;

    if (!correctTranslation?.word) {
      const nextIndex = index + 1;
      if (nextIndex < geezWordsList.length) {
        setCurrentChallengeIndex(nextIndex);
        loadChallenge(nextIndex, geezWordsList, translationsList);
      } else {
        endGame(score, geezWordsList.length);
      }
      return;
    }

    const correctOption = correctTranslation.word;
    const shuffledTranslations = shuffle(translationsList);

    const distractors = [
      ...new Set(
        shuffledTranslations
          .filter(
            (t) =>
              t.word_id !== geezWord.word_id &&
              t.words?.word &&
              t.words.word !== correctOption
          )
          .map((t) => t.words.word)
      ),
    ];

    // Bounded so a too-small translation pool can't spin this forever.
    let attempts = 0;
    while (distractors.length < 3 && attempts < shuffledTranslations.length * 2) {
      const randomExtra =
        shuffledTranslations[Math.floor(Math.random() * shuffledTranslations.length)];
      if (
        randomExtra?.words?.word &&
        !distractors.includes(randomExtra.words.word) &&
        randomExtra.words.word !== correctOption
      ) {
        distractors.push(randomExtra.words.word);
      }
      attempts += 1;
    }

    const options = shuffle([correctOption, ...distractors.slice(0, 3)]);

    setCurrentChallenge({ geez: geezWord.word, options, correctOption });
  };

  const startGame = async () => {
    setStatusMessage(null);
    setLoadingGame(true);

    try {
      const { data: wordsData, error: wordsError } = await supabase
        .from("words")
        .select("word_id, word")
        .eq("language_code", "gz")
        .ilike("word", `%${suffix}`);

      if (wordsError) {
        console.error("Error fetching Ge'ez words:", wordsError);
        setStatusMessage("Error fetching Ge'ez words. Please try again.");
        return;
      }

      if (!wordsData || wordsData.length === 0) {
        setStatusMessage(`No words found with suffix '${suffix}'.`);
        return;
      }

      const geezWordIds = wordsData.map((word) => word.word_id);
      const { data: translationsData, error: translationsError } = await supabase
        .from("translationmappings")
        .select(
          `
          word_id,
          related_word_id,
          words!translationmappings_related_word_id_fkey(word, language_code)
          `
        )
        .in("word_id", geezWordIds)
        .eq("words.language_code", languageCode);

      if (translationsError) {
        console.error("Error fetching translations:", translationsError);
        setStatusMessage("Error fetching translations. Please try again.");
        return;
      }

      const validGeezWords = wordsData.filter((word) =>
        translationsData.some((t) => t.word_id === word.word_id && t.words?.word)
      );

      if (validGeezWords.length === 0) {
        setStatusMessage("No valid translations found for the selected suffix.");
        return;
      }

      const shuffledWords = shuffle(validGeezWords);
      setGeezWords(shuffledWords);
      setTranslations(translationsData);
      setCurrentChallengeIndex(0);
      setScore(0);
      setUserAnswer(null);
      setGameOver(false);
      setGameStarted(true);
      loadChallenge(0, shuffledWords, translationsData);
    } catch (err) {
      console.error("Error starting game:", err);
      setStatusMessage("An unexpected error occurred. Please try again.");
    } finally {
      setLoadingGame(false);
    }
  };

  const handleStartNew = () => {
    gameSession.clearSession();
    setResumeSession(null);
  };

  const handleResume = async () => {
    const { languageCode: rLang, suffix: rSuffix, geezWordIds, currentChallengeIndex: rIndex, score: rScore } =
      resumeSession.state || {};

    if (!geezWordIds?.length) {
      setStatusMessage("Could not resume your previous game. Please start a new one.");
      setResumeSession(null);
      return;
    }

    setLoadingGame(true);

    try {
      const { data: wordsData, error: wordsError } = await supabase
        .from("words")
        .select("word_id, word")
        .in("word_id", geezWordIds);

      if (wordsError || !wordsData) throw wordsError || new Error("Could not load words");

      const orderedWords = geezWordIds
        .map((id) => wordsData.find((w) => w.word_id === id))
        .filter(Boolean);

      const { data: translationsData, error: translationsError } = await supabase
        .from("translationmappings")
        .select(
          `
          word_id,
          related_word_id,
          words!translationmappings_related_word_id_fkey(word, language_code)
          `
        )
        .in("word_id", geezWordIds)
        .eq("words.language_code", rLang);

      if (translationsError) throw translationsError;

      setLanguageCode(rLang);
      setSuffix(rSuffix);
      setGeezWords(orderedWords);
      setTranslations(translationsData);
      setCurrentChallengeIndex(rIndex);
      setScore(rScore || 0);
      setUserAnswer(null);
      setGameOver(false);
      setGameStarted(true);
      loadChallenge(rIndex, orderedWords, translationsData);
    } catch (err) {
      console.error("Error resuming game:", err);
      setStatusMessage("Could not resume your previous game. Please start a new one.");
    } finally {
      setLoadingGame(false);
      setResumeSession(null);
    }
  };

  const handleAnswer = (option) => {
    if (userAnswer) return;

    const isCorrect = option === currentChallenge.correctOption;
    const newScore = score + (isCorrect ? 1 : 0);
    setScore(newScore);
    setUserAnswer(option);

    setTimeout(() => {
      setUserAnswer(null);
      const nextIndex = currentChallengeIndex + 1;
      if (nextIndex < geezWords.length) {
        setCurrentChallengeIndex(nextIndex);
        loadChallenge(nextIndex, geezWords, translations);
        gameSession.save({
          state: {
            languageCode,
            suffix,
            geezWordIds: geezWords.map((w) => w.word_id),
            currentChallengeIndex: nextIndex,
            score: newScore,
          },
          score: newScore,
          totalQuestions: geezWords.length,
          status: "in_progress",
        });
      } else {
        endGame(newScore, geezWords.length);
      }
    }, 1000);
  };

  const optionStyle = (option) => {
    if (!userAnswer) return styles.option;
    if (option === currentChallenge.correctOption) {
      return [styles.option, styles.optionCorrect];
    }
    if (option === userAnswer) {
      return [styles.option, styles.optionWrong];
    }
    return styles.option;
  };

  if (gameOver) {
    return (
      <ScreenContainer center>
        <Card style={styles.card}>
          <ScreenHeader title="Game Over!" style={{ width: "100%" }} />
          <Text style={styles.score}>Your score: {finalScore}</Text>
          <Button variant="primary" onPress={() => setGameOver(false)} style={styles.fullWidthButton}>
            Play Again
          </Button>
        </Card>
      </ScreenContainer>
    );
  }

  if (!gameStarted) {
    return (
      <ScreenContainer scroll center>
        <Card style={styles.card}>
          <ScreenHeader title="Dictionary Game" style={{ width: "100%" }} />
          <Text style={styles.subtitle}>
            Test your knowledge of Ge'ez words and their translations.
          </Text>

          {!checkingResume && resumeSession && (
            <View style={styles.resumeBox}>
              <Text style={styles.resumeText}>
                Continue your previous game? (Score {resumeSession.score},{" "}
                {(resumeSession.state?.geezWordIds?.length || 0) -
                  (resumeSession.state?.currentChallengeIndex || 0)}{" "}
                remaining)
              </Text>
              <View style={styles.resumeButtons}>
                <Button variant="primary" size="sm" onPress={handleResume} disabled={loadingGame}>
                  Resume
                </Button>
                <Button variant="secondary" size="sm" onPress={handleStartNew} disabled={loadingGame}>
                  Start New
                </Button>
              </View>
            </View>
          )}

          <Select
            label="Select Language:"
            value={languageCode}
            onValueChange={setLanguageCode}
            items={LANGUAGE_ITEMS}
            style={styles.fullWidthField}
          />

          <Select
            label="Select Suffix:"
            value={suffix}
            onValueChange={setSuffix}
            items={SUFFIX_ITEMS}
            style={styles.fullWidthField}
          />

          {statusMessage && <Text style={styles.error}>{statusMessage}</Text>}
          {loadingGame && <ActivityIndicator style={styles.spacingTop} color={colors.primary} />}

          <Button
            variant="primary"
            onPress={startGame}
            disabled={loadingGame}
            style={styles.fullWidthButton}
          >
            Start Game
          </Button>

          {!gameSession.isSignedIn && (
            <Text style={styles.hint}>Sign in to save your progress and scores.</Text>
          )}
        </Card>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer center>
      <Card style={styles.card}>
        {currentChallenge ? (
          <>
            <Text style={styles.geezWord}>{currentChallenge.geez}</Text>
            <View style={styles.grid}>
              {currentChallenge.options.map((option, index) => (
                <Pressable
                  key={index}
                  style={optionStyle(option)}
                  onPress={() => handleAnswer(option)}
                  disabled={!!userAnswer}
                >
                  <Text style={typography.body}>{option}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.score}>Score: {score}</Text>
            <Text style={styles.score}>
              Remaining: {geezWords.length - currentChallengeIndex}
            </Text>
          </>
        ) : (
          <Text style={typography.body}>Loading...</Text>
        )}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 480,
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  fullWidthButton: {
    width: "100%",
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  resumeBox: {
    width: "100%",
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderGold,
    backgroundColor: colors.surfaceMuted,
    gap: spacing.sm,
  },
  resumeText: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: "center",
  },
  resumeButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  fullWidthField: {
    width: "100%",
  },
  error: {
    ...typography.body,
    color: colors.danger,
    textAlign: "center",
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
  spacingTop: {
    marginTop: spacing.xs,
  },
  geezWord: {
    fontFamily: fontFamily.ethiopicBold,
    fontSize: 32,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm + 2,
  },
  option: {
    minWidth: "40%",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.sm,
    alignItems: "center",
  },
  optionCorrect: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  optionWrong: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
  },
  score: {
    ...typography.bodySemiBold,
    color: colors.textSecondary,
  },
});
