import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useGeezEndings } from "../../hooks/useGeezEndings";
import { useVerbBank } from "../../hooks/useVerbBank";
import { useGameLanguage } from "../../hooks/useGameLanguage";
import { FAMILIES } from "../../lib/verbQuiz";
import { ScreenContainer, EmptyState, Icon } from "../../components/ui";
import { WordCard } from "../../components/WordCard";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

// ግሲ: browse the dictionary's Ge'ez verbs by their last letter. The letters fold down to
// the chosen one, the list shows each verb's meaning and can be filtered, and the word
// card steps to the previous or next verb.
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
  const { bank } = useVerbBank();
  const [lang] = useGameLanguage();
  // Picking a word folds the list down to that word; "Show all" opens it again.
  const [showAll, setShowAll] = useState(false);
  const [lettersOpen, setLettersOpen] = useState(true);
  const [filter, setFilter] = useState("");
  const collapsed = Boolean(selectedWord) && !showAll;

  const pickLetter = (letter) => {
    setShowAll(false);
    setLettersOpen(false);
    setFilter("");
    selectLetter(letter);
  };
  const pickWord = (word) => {
    setShowAll(false);
    selectWord(word);
  };

  // Meanings come from the verb list the games use (cached), in the games' language.
  const byWord = useMemo(() => new Map((bank?.words || []).map((e) => [e.word, e])), [bank]);
  const meaningOf = (word) => {
    const entry = byWord.get(word.trim());
    return entry?.ask[lang]?.[0] ?? entry?.tr.en?.[0] ?? null;
  };
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return endingWords;
    return endingWords.filter((word) => {
      if (word.includes(q)) return true;
      const entry = byWord.get(word.trim());
      return entry ? Object.values(entry.tr).some((list) => list.some((m) => m.toLowerCase().includes(q))) : false;
    });
  }, [endingWords, filter, byWord]);

  const at = selectedWord ? shown.indexOf(selectedWord) : -1;
  const prev = at > 0 ? shown[at - 1] : null;
  const next = at >= 0 && at < shown.length - 1 ? shown[at + 1] : null;

  // ዛሬ, ግሲ ፈተና and the games treat letters that sound alike as one family.
  const family = selectedLetter ? FAMILIES.find((f) => f.letters.includes(selectedLetter)) : null;

  return (
    <ScreenContainer scroll contentContainerStyle={styles.page}>
      {lettersOpen || !selectedLetter ? (
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
      ) : (
        <Pressable
          onPress={() => setLettersOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Words ending in ${selectedLetter}: choose another letter`}
          style={({ hovered }) => [styles.folded, hovered && styles.hover]}
        >
          <View style={[styles.letter, styles.letterOn]}>
            <Text style={[styles.letterText, styles.letterTextOn]}>{selectedLetter}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.foldedTitle}>Words ending in {selectedLetter}</Text>
            <Text style={styles.foldedCaption}>
              {wordsLoading ? "…" : `${endingWords.length} words`}
              {"  ·  "}
              <Text style={styles.foldedAction}>change letter</Text>
            </Text>
          </View>
        </Pressable>
      )}

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

          {family && family.letters.length > 1 ? (
            <Text style={styles.familyNote}>
              In ዛሬ, ግሲ ፈተና and the games, words ending in {family.label} are learned together as one family.
            </Text>
          ) : null}

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
            <>
              <View style={styles.filterBox}>
                <Icon name="search-outline" size={16} color={colors.textMuted} />
                <TextInput
                  value={filter}
                  onChangeText={setFilter}
                  placeholder="Filter by word or meaning"
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Filter the words"
                  style={styles.filterInput}
                />
              </View>
              {shown.length ? (
                <View style={styles.words}>
                  {shown.map((word) => {
                    const on = selectedWord === word;
                    const meaning = meaningOf(word);
                    return (
                      <Pressable
                        key={word}
                        onPress={() => pickWord(word)}
                        style={({ hovered }) => [styles.wordChip, hovered && !on && styles.hover, on && styles.wordChipOn]}
                      >
                        <Text style={[styles.wordChipText, on && styles.wordChipTextOn]}>{word}</Text>
                        {meaning ? (
                          <Text style={[styles.wordMeaning, on && styles.wordChipTextOn]} numberOfLines={1}>
                            {meaning}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.familyNote}>No word or meaning matches "{filter.trim()}".</Text>
              )}
            </>
          )}
        </View>
      ) : (
        <EmptyState message="Pick a letter to see the verbs that end with it." icon="search-outline" />
      )}

      {selectedWord && at >= 0 ? (
        <View style={styles.stepper}>
          <Pressable
            onPress={() => prev && pickWord(prev)}
            disabled={!prev}
            accessibilityRole="button"
            accessibilityLabel={prev ? `Previous: ${prev}` : "No previous word"}
            style={({ hovered }) => [styles.step, !prev && styles.stepOff, hovered && prev && styles.hover]}
          >
            <Text style={styles.stepText}>‹ {prev ?? ""}</Text>
          </Pressable>
          <Text style={styles.stepCount}>
            {at + 1} of {shown.length}
          </Text>
          <Pressable
            onPress={() => next && pickWord(next)}
            disabled={!next}
            accessibilityRole="button"
            accessibilityLabel={next ? `Next: ${next}` : "No next word"}
            style={({ hovered }) => [styles.step, styles.stepRight, !next && styles.stepOff, hovered && next && styles.hover]}
          >
            <Text style={styles.stepText}>{next ?? ""} ›</Text>
          </Pressable>
        </View>
      ) : null}

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
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    maxWidth: 190,
  },
  wordMeaning: { fontFamily: fontFamily.latinRegular, fontSize: 11, lineHeight: 15, color: colors.textSecondary },
  folded: {
    ...card,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  foldedTitle: { fontFamily: fontFamily.latinSemiBold, fontSize: 16, lineHeight: 24, color: colors.textPrimary },
  foldedCaption: { fontFamily: fontFamily.latinRegular, fontSize: 12, lineHeight: 16, color: colors.textMuted },
  foldedAction: { color: colors.primaryDark, textDecorationLine: "underline" },
  familyNote: { fontFamily: fontFamily.latinRegular, fontSize: 12, lineHeight: 18, color: colors.textMuted },
  filterBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    paddingBottom: 4,
    maxWidth: 320,
  },
  filterInput: {
    flex: 1,
    fontFamily: fontFamily.latinRegular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textPrimary,
    padding: 0,
    outlineStyle: "none",
  },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  step: { flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.md },
  stepRight: { alignItems: "flex-end" },
  stepOff: { opacity: 0.35 },
  stepText: { fontFamily: fontFamily.ethiopicRegular, fontSize: 16, lineHeight: 24, color: colors.primaryDark },
  stepCount: { fontFamily: fontFamily.latinRegular, fontSize: 12, color: colors.textMuted },
  wordChipOn: { backgroundColor: colors.primary },
  wordChipText: { fontFamily: fontFamily.ethiopicRegular, fontSize: 16, lineHeight: 22, color: colors.textPrimary },
  wordChipTextOn: { fontFamily: fontFamily.ethiopicBold, color: colors.onPrimary },
});
