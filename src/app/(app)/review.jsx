import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { useStudyList } from "../../hooks/useStudyList";
import { supabase } from "../../lib/supabaseClient";
import { ScreenContainer, Card, Button, EmptyState, ScreenHeader } from "../../components/ui";
import { colors, fontFamily, spacing, typography } from "../../theme";

export default function Review() {
  const { user, loading: authLoading } = useAuth();
  const { allItems, dueItems, loading, error, loadItems, removeWord, recordReview } = useStudyList();
  const [languageMap, setLanguageMap] = useState({});

  const [reviewing, setReviewing] = useState(false);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [translations, setTranslations] = useState([]);
  const [sewasewExamples, setSewasewExamples] = useState([]);
  const [cardLoading, setCardLoading] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionScore, setSessionScore] = useState(0);

  useEffect(() => {
    if (user) loadItems();
  }, [user, loadItems]);

  useEffect(() => {
    supabase
      .from("languages")
      .select("*")
      .then(({ data, error }) => {
        if (error) return;
        const map = (data || []).reduce((acc, lang) => {
          acc[lang.language_code] = lang.language_name;
          return acc;
        }, {});
        setLanguageMap(map);
      });
  }, []);

  const fetchCardTranslations = async (word) => {
    setCardLoading(true);
    setTranslations([]);
    setSewasewExamples([]);
    try {
      const { data: translationData, error: translationError } = await supabase.rpc(
        "get_translations",
        { search_word: word, language: "gz" }
      );

      if (translationError) {
        console.error("Error fetching translations:", translationError);
        return;
      }

      setTranslations(translationData || []);

      if (translationData && translationData.length > 0) {
        const { data: sewasewData, error: sewasewError } = await supabase
          .from("sewasew")
          .select("sewasew_id, sewasew_text")
          .in(
            "word_id",
            translationData.map((item) => item.word_id)
          );
        if (!sewasewError) setSewasewExamples(sewasewData || []);
      }
    } finally {
      setCardLoading(false);
    }
  };

  const startReview = () => {
    setReviewQueue(dueItems);
    setReviewIndex(0);
    setShowAnswer(false);
    setSessionDone(false);
    setSessionScore(0);
    setReviewing(true);
    fetchCardTranslations(dueItems[0].word);
  };

  const handleAnswer = async (gotIt) => {
    const currentItem = reviewQueue[reviewIndex];
    await recordReview(currentItem, gotIt);
    if (gotIt) setSessionScore((s) => s + 1);

    const nextIndex = reviewIndex + 1;
    if (nextIndex < reviewQueue.length) {
      setReviewIndex(nextIndex);
      setShowAnswer(false);
      fetchCardTranslations(reviewQueue[nextIndex].word);
    } else {
      setReviewing(false);
      setSessionDone(true);
      loadItems();
    }
  };

  const groupedTranslations = Object.entries(
    translations.reduce((acc, result) => {
      const lang = languageMap[result.target_language] || result.target_language;
      if (!acc[lang]) acc[lang] = [];
      acc[lang].push(result.translated_word);
      return acc;
    }, {})
  );

  if (authLoading) {
    return (
      <ScreenContainer center>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!user) {
    return <Redirect href="/auth/sign-in" />;
  }

  if (reviewing) {
    const currentItem = reviewQueue[reviewIndex];
    return (
      <ScreenContainer center>
        <Card style={styles.card}>
          <ScreenHeader title="ክለሳ" titleEthiopic style={{ width: "100%" }} />
          <Text style={styles.progress}>
            Card {reviewIndex + 1} of {reviewQueue.length}
          </Text>
          <Text style={styles.geezWord}>{currentItem.word}</Text>

          {!showAnswer ? (
            <Button variant="primary" onPress={() => setShowAnswer(true)} style={styles.fullWidthButton}>
              Show Answer
            </Button>
          ) : cardLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.spacingTop} />
          ) : (
            <>
              <View style={styles.answerBox}>
                {groupedTranslations.length > 0 ? (
                  groupedTranslations.map(([language, words]) => (
                    <View key={language} style={styles.resultRow}>
                      <Text style={styles.resultLanguage}>{language}</Text>
                      <Text style={styles.resultWords}>{words.join(", ")}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.muted}>No translations found.</Text>
                )}
                {sewasewExamples.map((example) => (
                  <Text key={example.sewasew_id} style={styles.sewasewItem}>
                    • {example.sewasew_text}
                  </Text>
                ))}
              </View>

              <View style={styles.answerButtons}>
                <Button variant="danger" onPress={() => handleAnswer(false)} style={styles.answerButton}>
                  Didn't know it
                </Button>
                <Button variant="primary" onPress={() => handleAnswer(true)} style={styles.answerButton}>
                  Got it
                </Button>
              </View>
            </>
          )}
        </Card>
      </ScreenContainer>
    );
  }

  if (sessionDone) {
    return (
      <ScreenContainer center>
        <Card style={styles.card}>
          <ScreenHeader title="Session Complete!" style={{ width: "100%" }} />
          <Text style={styles.progress}>
            You got {sessionScore} of {reviewQueue.length} right.
          </Text>
          <Button variant="primary" onPress={() => setSessionDone(false)} style={styles.fullWidthButton}>
            Back to List
          </Button>
        </Card>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll contentContainerStyle={styles.container}>
      <ScreenHeader title="ክለሳ" titleEthiopic style={{ width: "100%" }} />
      <Text style={styles.subtitle}>
        Words you've saved from Dictionary and ግሲ, reviewed with spaced repetition.
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.spacingTop} />
      ) : allItems.length === 0 ? (
        <EmptyState
          message="No saved words yet -- save a word from Dictionary or ግሲ to start building your study list."
          icon="bookmark-outline"
        />
      ) : (
        <>
          <Card style={styles.statsCard}>
            <Text style={styles.statsText}>
              {allItems.length} word{allItems.length === 1 ? "" : "s"} saved -- {dueItems.length} due
              today
            </Text>
            <Button
              variant="primary"
              onPress={startReview}
              disabled={dueItems.length === 0}
              style={styles.fullWidthButton}
            >
              {dueItems.length === 0 ? "Nothing Due Today" : `Start Review (${dueItems.length})`}
            </Button>
          </Card>

          <View style={styles.list}>
            {allItems.map((item) => (
              <Card key={item.id} style={styles.listRow}>
                <Text style={styles.listWord}>{item.word}</Text>
                <Text style={styles.listDate}>Next: {item.next_review_date}</Text>
                <Button variant="danger" size="sm" pill onPress={() => removeWord(item.id)}>
                  Remove
                </Button>
              </Card>
            ))}
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.md,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  error: {
    ...typography.body,
    color: colors.danger,
    textAlign: "center",
  },
  spacingTop: {
    marginTop: spacing.sm,
  },
  statsCard: {
    width: "100%",
    maxWidth: 480,
    alignItems: "center",
    gap: spacing.sm,
  },
  statsText: {
    ...typography.bodySemiBold,
    color: colors.textPrimary,
  },
  fullWidthButton: {
    width: "100%",
    marginTop: spacing.sm,
  },
  list: {
    width: "100%",
    maxWidth: 480,
    gap: spacing.sm,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  listWord: {
    fontFamily: fontFamily.ethiopicBold,
    fontSize: 18,
    color: colors.primary,
    flex: 1,
  },
  listDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  progress: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  geezWord: {
    fontFamily: fontFamily.ethiopicBold,
    fontSize: 36,
    color: colors.textPrimary,
    marginVertical: spacing.md,
  },
  answerBox: {
    width: "100%",
    gap: spacing.xs,
  },
  resultRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  resultLanguage: {
    ...typography.bodySemiBold,
    color: colors.textPrimary,
    minWidth: 120,
  },
  resultWords: {
    flex: 1,
    fontFamily: fontFamily.ethiopicRegular,
    fontSize: 16,
    color: colors.textPrimary,
  },
  sewasewItem: {
    fontFamily: fontFamily.ethiopicRegular,
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  muted: {
    ...typography.caption,
    color: colors.textMuted,
  },
  answerButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
    marginTop: spacing.md,
  },
  answerButton: {
    flex: 1,
  },
});
