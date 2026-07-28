import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { supabase } from "../../lib/supabaseClient";

const SUFFIXES = [
  "ሐ", "ሀ", "ኀ", "ለ", "መ", "ሰ", "ሠ", "ረ", "ቀ", "በ",
  "ተ", "ነ", "ዐ", "አ", "ከ", "ወ", "ዘ", "የ", "ደ", "ገ",
  "ጠ", "ጰ", "ጸ", "ፀ", "ፈ", "ፐ",
];

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

export default function Game() {
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

  const endGame = (finalScoreValue) => {
    setFinalScore(finalScoreValue);
    setGameOver(true);
    setGameStarted(false);
    setCurrentChallenge(null);
    setGeezWords([]);
    setTranslations([]);
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
        endGame(score);
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
        endGame(score);
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

    while (distractors.length < 3) {
      const randomExtra =
        shuffledTranslations[Math.floor(Math.random() * shuffledTranslations.length)];
      if (
        randomExtra?.words?.word &&
        !distractors.includes(randomExtra.words.word) &&
        randomExtra.words.word !== correctOption
      ) {
        distractors.push(randomExtra.words.word);
      }
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
      } else {
        endGame(newScore);
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
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Game Over!</Text>
          <Text style={styles.score}>Your score: {finalScore}</Text>
          <Pressable style={styles.startButton} onPress={() => setGameOver(false)}>
            <Text style={styles.startButtonText}>Play Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!gameStarted) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Dictionary Game</Text>
          <Text style={styles.subtitle}>
            Test your knowledge of Ge'ez words and their translations.
          </Text>

          <Text style={styles.label}>Select Language:</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={languageCode} onValueChange={setLanguageCode}>
              <Picker.Item label="Tigrinya" value="ti" />
              <Picker.Item label="Amharic" value="am" />
            </Picker>
          </View>

          <Text style={styles.label}>Select Suffix:</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={suffix} onValueChange={setSuffix}>
              {SUFFIXES.map((letter) => (
                <Picker.Item key={letter} label={letter} value={letter} />
              ))}
            </Picker>
          </View>

          {statusMessage && <Text style={styles.error}>{statusMessage}</Text>}
          {loadingGame && <ActivityIndicator style={styles.spacingTop} />}

          <Pressable style={styles.startButton} onPress={startGame} disabled={loadingGame}>
            <Text style={styles.startButtonText}>Start Game</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
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
                  <Text>{option}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.score}>Score: {score}</Text>
            <Text style={styles.score}>
              Remaining: {geezWords.length - currentChallengeIndex}
            </Text>
          </>
        ) : (
          <Text>Loading...</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    padding: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontFamily: "NotoSansEthiopic_700Bold",
    fontSize: 26,
    color: "#854d0e",
  },
  subtitle: {
    fontSize: 14,
    color: "#57534e",
    textAlign: "center",
    marginBottom: 8,
  },
  label: {
    alignSelf: "flex-start",
    fontSize: 14,
    color: "#57534e",
  },
  pickerWrapper: {
    width: "100%",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
    borderRadius: 8,
  },
  error: {
    color: "#dc2626",
    textAlign: "center",
  },
  spacingTop: {
    marginTop: 4,
  },
  startButton: {
    marginTop: 8,
    width: "100%",
    backgroundColor: "#854d0e",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  startButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  geezWord: {
    fontFamily: "NotoSansEthiopic_700Bold",
    fontSize: 32,
    marginBottom: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  option: {
    minWidth: "40%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
    borderRadius: 8,
    alignItems: "center",
  },
  optionCorrect: {
    backgroundColor: "#d4edda",
    borderColor: "#86efac",
  },
  optionWrong: {
    backgroundColor: "#f8d7da",
    borderColor: "#fca5a5",
  },
  score: {
    fontSize: 14,
    fontWeight: "600",
    color: "#57534e",
  },
});
