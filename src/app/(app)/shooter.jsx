import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ScreenContainer, ScreenHeader } from "../../components/ui";
import { Shooter } from "../../components/games/Shooter";
import { ShooterOver, ShooterStart } from "../../components/games/ShooterPanels";
import { useVerbBank } from "../../hooks/useVerbBank";
import { useVerbProgress } from "../../hooks/useVerbProgress";
import { useGameScores } from "../../hooks/useGameScores";
import { newGame } from "../../lib/shooter";
import { stateOf, wordsInScope } from "../../lib/verbQuiz";
import { colors, spacing, typography } from "../../theme";

const GAME_TYPE = "verb_shooter";
// Shares the answer language with ግሲ ፈተና, so switching it in one switches both.
const SETTINGS_KEY = "bete-qinie:verb-quiz-settings:v1";

export default function ShooterScreen() {
  const { bank, loading, error } = useVerbBank();
  const progress = useVerbProgress();
  const scores = useGameScores(GAME_TYPE);

  const [lang, setLang] = useState("am");
  const [playing, setPlaying] = useState(null); // the game handed to <Shooter>
  const [over, setOver] = useState(null); // { game, isBest, previousBest, nowKnown }
  const [knownBefore, setKnownBefore] = useState(() => new Set());

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY)
      .then((raw) => raw && JSON.parse(raw).lang && setLang(JSON.parse(raw).lang))
      .catch(() => {});
  }, []);

  const changeLang = (code) => {
    setLang(code);
    AsyncStorage.getItem(SETTINGS_KEY)
      .then((raw) => AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...JSON.parse(raw || "{}"), lang: code })))
      .catch(() => {});
  };

  const pool = useMemo(() => (bank ? wordsInScope(bank, { mode: "all" }, lang) : []), [bank, lang]);

  const play = () => {
    setOver(null);
    setKnownBefore(new Set(Object.keys(progress.stats).filter((id) => stateOf(progress.stats[id]) === "known").map(Number)));
    setPlaying(newGame({ bank, pool, stats: progress.stats, lang }));
  };

  const finish = async (game) => {
    const previousBest = scores.best;
    // Verbs this game took over the line into "known" (right three times running).
    const nowKnown = game.practised.filter((id) => !knownBefore.has(id) && stateOf(progress.stats[id]) === "known").length;
    setPlaying(null);
    setOver({ game, isBest: false, previousBest, nowKnown });
    const isBest = await scores.saveScore({
      score: game.score,
      rounds: game.cleared + game.escaped,
      state: { bestCombo: game.bestCombo, lang: game.lang, missed: game.missed },
    });
    setOver({ game, isBest, previousBest, nowKnown });
  };

  let body;
  if (error) body = <Text style={{ ...typography.body, color: colors.danger }}>{error}</Text>;
  else if (loading || !progress.ready || !scores.ready) body = <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />;
  else if (playing)
    body = (
      <Shooter
        initialGame={playing}
        bank={bank}
        onAnswer={({ wordId, correct }) => progress.recordAnswer(wordId, correct)}
        onOver={finish}
      />
    );
  else if (over)
    body = (
      <ShooterOver
        game={over.game}
        bank={bank}
        isBest={over.isBest}
        previousBest={over.previousBest}
        nowKnown={over.nowKnown}
        signedIn={progress.mode === "account"}
        onAgain={play}
        onPractise={(ids) => router.push({ pathname: "/verb-quiz", params: { words: ids.join(",") } })}
      />
    );
  else
    body = (
      <ShooterStart
        lang={lang}
        onLang={changeLang}
        available={pool.length}
        best={scores.best}
        last={scores.last}
        onPlay={play}
      />
    );

  return (
    <ScreenContainer scroll>
      <ScreenHeader
        title="ቀስት"
        titleEthiopic
        onBack={playing ? undefined : () => (router.canGoBack() ? router.back() : router.replace("/game"))}
      />
      {body}
    </ScreenContainer>
  );
}
