import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useGeezEndings } from "../../hooks/useGeezEndings";
import { useWordProgress } from "../../context/WordProgressContext";
import { ScreenContainer, Card, Button, EmptyState, Icon } from "../../components/ui";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

export default function VerbRoots() {
  const {
    languageMap,
    endingLetters,
    selectedLetter,
    endingWords,
    wordsLoading,
    selectLetter,
    selectedWord,
    translations,
    sewasewExamples,
    translationsLoading,
    selectWord,
    error,
  } = useGeezEndings();
  const progress = useWordProgress();
  // Picking a word folds the list down to that word; "Show all" opens it again.
  const [showAll, setShowAll] = useState(false);
  const collapsed = Boolean(selectedWord) && !showAll;
  const pickLetter = (letter) => {
    setShowAll(false);
    selectLetter(letter);
  };
  const pickWord = (word) => {
    setShowAll(false);
    selectWord(word);
  };

  // The selected verb's id comes back with its translations.
  const wordId = selectedWord ? translations[0]?.word_id : null;
  const saved = Boolean(wordId && progress.stats[wordId]?.saved);

  const groupedTranslations = Object.entries(
    translations.reduce((acc, result) => {
      const lang = languageMap[result.target_language] || result.target_language;
      if (!acc[lang]) acc[lang] = [];
      acc[lang].push(result.translated_word);
      return acc;
    }, {})
  );

  return (
    <ScreenContainer scroll contentContainerStyle={styles.container}>
      <Text style={styles.subtitle}>
        Browse Ge'ez words by their last letter -- tap a letter to see words ending with it.
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.chipRow}>
        {endingLetters.map((letter) => (
          <Pressable
            key={letter}
            style={[styles.chip, selectedLetter === letter && styles.chipSelected]}
            onPress={() => pickLetter(letter)}
          >
            <Text style={selectedLetter === letter ? styles.chipTextSelected : styles.chipText}>
              {letter}
            </Text>
          </Pressable>
        ))}
      </View>

      {selectedLetter && (
        <Card style={styles.fullWidth}>
          <View style={styles.resultsHeader}>
            <Text style={styles.cardTitle}>
              Words ending with "{selectedLetter}"
              {!wordsLoading && endingWords.length ? <Text style={styles.count}>  {endingWords.length}</Text> : null}
            </Text>
            {selectedWord && !wordsLoading ? (
              <Pressable
                onPress={() => setShowAll(!showAll)}
                accessibilityRole="button"
                hitSlop={6}
                style={({ hovered }) => [styles.toggle, hovered && styles.toggleHover]}
              >
                <Text style={styles.toggleText}>{collapsed ? "Show all" : "Hide list"}</Text>
                <Icon name={collapsed ? "chevron-down" : "chevron-up"} size={16} color={colors.primaryDark} />
              </Pressable>
            ) : null}
          </View>

          {wordsLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.spacingTop} />
          ) : endingWords.length === 0 ? (
            <EmptyState message={`No words found ending with "${selectedLetter}".`} icon="search-outline" />
          ) : collapsed ? (
            <Pressable onPress={() => setShowAll(true)} style={styles.chipRowLeft} accessibilityLabel="Show all words">
              <View style={[styles.chipMuted, styles.chipSelected]}>
                <Text style={styles.chipTextSelected}>{selectedWord}</Text>
              </View>
            </Pressable>
          ) : (
            <View style={styles.chipRow}>
              {endingWords.map((word) => (
                <Pressable
                  key={word}
                  style={[styles.chipMuted, selectedWord === word && styles.chipSelected]}
                  onPress={() => pickWord(word)}
                >
                  <Text style={selectedWord === word ? styles.chipTextSelected : styles.chipText}>
                    {word}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </Card>
      )}

      {translationsLoading && <ActivityIndicator color={colors.primary} style={styles.spacingTop} />}

      {groupedTranslations.length > 0 && (
        <Card style={styles.fullWidth}>
          <View style={styles.resultsHeader}>
            <Text style={styles.cardTitle}>{selectedWord} -- Translations</Text>
            {wordId ? (
              <Button
                variant={saved ? "danger" : "secondary"}
                size="sm"
                pill
                onPress={() => (saved ? progress.unsave(wordId) : progress.save([wordId]))}
              >
                {saved ? "In ክለሳ ✓" : "Save to ክለሳ"}
              </Button>
            ) : null}
          </View>
          {groupedTranslations.map(([language, words]) => (
            <View key={language} style={styles.resultRow}>
              <Text style={styles.resultLanguage}>{language}</Text>
              <Text style={styles.resultWords}>
                {words.join(language === "ኢንግልሽ - English" ? ", " : "፣")}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {sewasewExamples.length > 0 && (
        <Card style={styles.fullWidth}>
          <Text style={styles.cardTitle}>Sewasew:</Text>
          {sewasewExamples.map((example) => (
            <Text key={example.sewasew_id} style={styles.sewasewItem}>
              • {example.sewasew_text}
            </Text>
          ))}
        </Card>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.md,
  },
  fullWidth: {
    width: "100%",
    maxWidth: 640,
    gap: spacing.sm,
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    width: "100%",
    maxWidth: 640,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipRowLeft: {
    flexDirection: "row",
  },
  count: {
    fontFamily: fontFamily.latinRegular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },
  toggleHover: {
    backgroundColor: colors.surfaceMuted,
  },
  toggleText: {
    ...typography.label,
    color: colors.primaryDark,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipMuted: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
  },
  chipText: {
    color: colors.textSecondary,
    fontFamily: fontFamily.ethiopicRegular,
  },
  chipTextSelected: {
    color: colors.white,
    fontFamily: fontFamily.ethiopicRegular,
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    ...typography.h2,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
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
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
});
