import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useGeezEndings } from "../../hooks/useGeezEndings";
import { useStudyList } from "../../hooks/useStudyList";
import { ScreenContainer, Card, Button, EmptyState, ScreenHeader } from "../../components/ui";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

export default function VerbRoots() {
  const {
    languageMap,
    endingLetters,
    lettersLoading,
    loadEndingLetters,
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
  const { allItems, saveWord, removeWord, loadItems, isSignedIn } = useStudyList();

  useEffect(() => {
    loadEndingLetters();
  }, [loadEndingLetters]);

  useEffect(() => {
    if (isSignedIn) loadItems();
  }, [isSignedIn, loadItems]);

  const savedItem = allItems.find((item) => item.word === selectedWord && item.language_code === "gz");

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
      <ScreenHeader title="ግሲ" titleEthiopic style={{ width: "100%" }} />
      <Text style={styles.subtitle}>
        Browse Ge'ez words by their last letter -- tap a letter to see words ending with it.
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {lettersLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.spacingTop} />
      ) : (
        <View style={styles.chipRow}>
          {endingLetters.map((letter) => (
            <Pressable
              key={letter}
              style={[styles.chip, selectedLetter === letter && styles.chipSelected]}
              onPress={() => selectLetter(letter)}
            >
              <Text style={selectedLetter === letter ? styles.chipTextSelected : styles.chipText}>
                {letter}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {selectedLetter && (
        <Card style={styles.fullWidth}>
          <Text style={styles.cardTitle}>Words ending with "{selectedLetter}"</Text>

          {wordsLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.spacingTop} />
          ) : endingWords.length === 0 ? (
            <EmptyState message={`No words found ending with "${selectedLetter}".`} icon="search-outline" />
          ) : (
            <View style={styles.chipRow}>
              {endingWords.map((word) => (
                <Pressable
                  key={word}
                  style={[styles.chipMuted, selectedWord === word && styles.chipSelected]}
                  onPress={() => selectWord(word)}
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
            {isSignedIn && (
              <Button
                variant={savedItem ? "danger" : "secondary"}
                size="sm"
                pill
                onPress={() => (savedItem ? removeWord(savedItem.id) : saveWord(selectedWord, "gz"))}
              >
                {savedItem ? "Saved ✓" : "Save"}
              </Button>
            )}
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
