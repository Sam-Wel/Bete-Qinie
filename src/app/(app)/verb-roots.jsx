import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useGeezEndings } from "../../hooks/useGeezEndings";
import { ScreenContainer, EmptyState, Icon } from "../../components/ui";
import { WordCard } from "../../components/WordCard";
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
    entries,
    sewasewExamples,
    translationsLoading,
    selectWord,
    error,
  } = useGeezEndings();
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

  return (
    <ScreenContainer scroll contentContainerStyle={styles.page}>
      <View style={styles.card}>
        <Text style={styles.lead}>Browse Ge'ez verbs by their last letter.</Text>
        <View style={styles.letters}>
          {endingLetters.map((letter) => {
            const on = selectedLetter === letter;
            return (
              <Pressable
                key={letter}
                onPress={() => pickLetter(letter)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Words ending with ${letter}`}
                style={({ hovered }) => [styles.letter, hovered && !on && styles.hover, on && styles.letterOn]}
              >
                <Text style={[styles.letterText, on && styles.letterTextOn]}>{letter}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {selectedLetter ? (
        <View style={styles.card}>
          <View style={styles.listHead}>
            <Text style={styles.listTitle}>
              Ending in <Text style={styles.listLetter}>{selectedLetter}</Text>
              {!wordsLoading && endingWords.length ? <Text style={styles.count}>  ·  {endingWords.length} words</Text> : null}
            </Text>
            {selectedWord && !wordsLoading ? (
              <Pressable
                onPress={() => setShowAll(!showAll)}
                accessibilityRole="button"
                hitSlop={6}
                style={({ hovered }) => [styles.toggle, hovered && styles.hover]}
              >
                <Text style={styles.toggleText}>{collapsed ? "Show all" : "Hide list"}</Text>
                <Icon name={collapsed ? "chevron-down" : "chevron-up"} size={16} color={colors.primaryDark} />
              </Pressable>
            ) : null}
          </View>

          {wordsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : endingWords.length === 0 ? (
            <EmptyState message={`No words found ending with "${selectedLetter}".`} icon="search-outline" />
          ) : collapsed ? (
            <Pressable onPress={() => setShowAll(true)} style={styles.words} accessibilityLabel="Show all words">
              <View style={[styles.wordChip, styles.wordChipOn]}>
                <Text style={[styles.wordChipText, styles.wordChipTextOn]}>{selectedWord}</Text>
              </View>
            </Pressable>
          ) : (
            <View style={styles.words}>
              {endingWords.map((word) => {
                const on = selectedWord === word;
                return (
                  <Pressable
                    key={word}
                    onPress={() => pickWord(word)}
                    style={({ hovered }) => [styles.wordChip, hovered && !on && styles.hover, on && styles.wordChipOn]}
                  >
                    <Text style={[styles.wordChipText, on && styles.wordChipTextOn]}>{word}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ) : (
        <EmptyState message="Pick a letter to see the verbs that end with it." icon="search-outline" />
      )}

      {translationsLoading ? <ActivityIndicator color={colors.primary} /> : null}

      {selectedWord && !translationsLoading
        ? entries.map((entry, i) => (
            <WordCard
              key={entry.geezId ?? i}
              word={entry.geez ?? selectedWord}
              geezId={entry.geezId}
              meanings={entry.meanings}
              examples={sewasewExamples.filter((x) => x.word_id === entry.geezId)}
              languageMap={languageMap}
            />
          ))
        : null}
    </ScreenContainer>
  );
}

const card = {
  width: "100%",
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radii.lg + 4,
  padding: spacing.lg + 4,
};

const styles = StyleSheet.create({
  page: { gap: spacing.lg },
  card: { ...card, gap: spacing.md },
  lead: { ...typography.caption, color: colors.textSecondary },
  error: { ...typography.body, color: colors.danger },
  letters: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm },
  letter: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  hover: { backgroundColor: colors.surfaceMuted },
  letterOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  letterText: { fontFamily: fontFamily.ethiopicBold, fontSize: 19, lineHeight: 26, color: colors.textPrimary },
  letterTextOn: { color: colors.onPrimary },
  listHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, flexWrap: "wrap" },
  listTitle: { fontFamily: fontFamily.latinBold, fontSize: 17, lineHeight: 26, color: colors.textPrimary },
  listLetter: { fontFamily: fontFamily.ethiopicBold, fontSize: 20, color: colors.primaryDark },
  count: { fontFamily: fontFamily.latinRegular, fontSize: 14, color: colors.textSecondary },
  toggle: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: spacing.sm, borderRadius: radii.sm },
  toggleText: { ...typography.label, color: colors.primaryDark },
  words: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  wordChip: {
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  wordChipOn: { backgroundColor: colors.primary },
  wordChipText: { fontFamily: fontFamily.ethiopicRegular, fontSize: 16, lineHeight: 22, color: colors.textPrimary },
  wordChipTextOn: { fontFamily: fontFamily.ethiopicBold, color: colors.onPrimary },
});
