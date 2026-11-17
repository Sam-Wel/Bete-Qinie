import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useWindowDimensions } from "../../hooks/useWindowDimensions";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { Button, Icon } from "../../components/ui";
import { CrossMenuIcon } from "../../components/ui/CrossMenuIcon";
import { LightRays } from "../../components/manuscript/LightRays";
import { useLabPiece } from "../../hooks/useLab";
import { FocusPicker, GameFrame, LanguagePicker, StartCard } from "../../components/games/GameFrame";
import { Choices } from "../../components/games/Choices";
import { GameResults } from "../../components/games/GameResults";
import { Meanings } from "../../components/verbQuiz/QuizPlay";
import { scriptFontBold } from "../../components/verbQuiz/shared";
import { useVerbGame } from "../../hooks/useVerbGame";
import { BOSSES, PLAYER_HP, attack, battleState, newBattle, nextBoss, questionFor } from "../../lib/verbGames";
import { LANGUAGE_LABEL, pickWords, wordsInScope } from "../../lib/verbQuiz";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

// The victory light's size (the lab's light rays behind the cross).
const RAYS = 200;

const NIGHT = "#17110a";
const GOLD = "#e0a52a";
const GOLD_SOFT = "#f6e2ac";
const RED = "#d0553c";
const LIGHT = "#f2c14e"; // the lamp's light
const NEXT_MS = 1100;

function HealthBar({ value, max, color, label }) {
  const pct = Math.max(0, value / max);
  return (
    <View style={styles.hp}>
      <View style={styles.hpHead}>
        <Text style={styles.hpLabel}>{label}</Text>
        <Text style={styles.hpNum}>
          {value}/{max}
        </Text>
      </View>
      <View style={styles.hpTrack}>
        <View style={[styles.hpFill, { width: `${pct * 100}%`, backgroundColor: pct < 0.3 ? RED : color }]} />
      </View>
    </View>
  );
}

// A number that floats up and fades where damage lands.
function Damage({ hit }) {
  return (
    <Animated.Text entering={ZoomIn.duration(150)} exiting={FadeOut.duration(400)} style={[styles.damage, { color: hit.color }, hit.side === "boss" ? styles.damageBoss : styles.damagePlayer]}>
      {hit.text}
    </Animated.Text>
  );
}

// The learner's lamp: its flame flickers, and burns lower as the light runs down.
function Lamp({ light, size }) {
  const flicker = useSharedValue(1);
  useEffect(() => {
    flicker.value = withRepeat(withSequence(withTiming(1.07, { duration: 650 }), withTiming(0.95, { duration: 850 })), -1, true);
  }, []);
  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: flicker.value }] }));
  const glow = 0.4 + 0.6 * light;
  return (
    <View style={[styles.lamp, { opacity: 0.45 + 0.55 * light }]}>
      <Animated.View style={[styles.flame, { boxShadow: `0 0 ${Math.round(28 * glow)}px rgba(242,193,78,${0.55 * glow})` }, flameStyle]}>
        <Icon name="flame" size={size * (0.7 + 0.3 * light)} color={LIGHT} strokeWidth={2} />
      </Animated.View>
      <View style={[styles.lampBase, { width: size * 0.8 }]} />
    </View>
  );
}

// Verb Boss Battle: answer about ግዕዝ verbs to strike the adversary; miss and your lamp dims.
// You play a learner with a lamp, not the cross: the cross only appears over a beaten
// adversary, because the cross is never the one that loses.
export default function BossBattle() {
  const game = useVerbGame("verb_boss");
  const [battle, setBattle] = useState(null);
  const [queue, setQueue] = useState([]);
  const [turn, setTurn] = useState(null); // { question, entry, chosen, index }
  const [hit, setHit] = useState(null); // { side, text, color, key }
  const [phase, setPhase] = useState("start"); // start | fight | victory | over
  const [left, setLeft] = useState(null);
  const [result, setResult] = useState(null);
  const timer = useRef(null);
  // Phones get a shorter arena so all four answers stay on screen.
  const compact = useWindowDimensions().width < 520;
  const victoryLight = useLabPiece("victoryLight");
  const cross = compact ? 56 : 72;
  const stats = useRef({ right: 0, asked: 0, bossesBeaten: 0, bestCombo: 0 });

  // Idle bob for the boss, plus hit and lunge motions.
  const bob = useSharedValue(0);
  const bossShift = useSharedValue(0);
  const bossFlash = useSharedValue(0);
  const playerShift = useSharedValue(0);
  const arrow = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(withSequence(withTiming(-8, { duration: 900 }), withTiming(0, { duration: 900 })), -1);
    return () => clearInterval(timer.current);
  }, []);
  const bossStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }, { translateX: bossShift.value }, { scale: 1 + bossFlash.value * 0.08 }],
    opacity: 1 - bossFlash.value * 0.35,
  }));
  const playerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: playerShift.value }] }));
  const arrowStyle = useAnimatedStyle(() => ({
    opacity: arrow.value > 0 && arrow.value < 1 ? 1 : 0,
    transform: [{ translateX: arrow.value * 190 }],
  }));

  const ask = (b, q, index) => {
    const entry = q[index % q.length];
    // Later bosses ask with look-alike options; directions alternate at random.
    const direction = Math.random() < 0.5 ? "toMeaning" : "toGeez";
    setTurn({ entry, index, chosen: null, question: questionFor(entry, game.lang, direction, game.bank, b.level >= 2 ? "hard" : "medium") });
    clearInterval(timer.current);
    setLeft(b.boss.seconds);
    timer.current = setInterval(() => setLeft((s) => (s == null ? s : s - 1)), 1000);
  };

  const start = () => {
    // Free play: missed verbs first, then the usual weakest-first mix.
    // Focused: today's words (and due ones), weakest first.
    const pool = wordsInScope(game.bank, { mode: "all" }, game.lang);
    const missed = game.focus === "free" ? pickWords(pool, game.stats, "missed", 40) : [];
    const rest = game.words(200, { min: 8 }).filter((e) => !missed.includes(e));
    const q = [...missed, ...rest];
    const b = newBattle(0);
    stats.current = { right: 0, asked: 0, bossesBeaten: 0, bestCombo: 0 };
    setQueue(q);
    setBattle(b);
    setPhase("fight");
    setResult(null);
    game.start();
    ask(b, q, 0);
  };

  const end = async (b, won) => {
    clearInterval(timer.current);
    setPhase("over");
    const res = { xp: b.xp, won, level: b.level, ...stats.current, isBest: false };
    setResult(res);
    const isBest = await game.finish({ score: b.xp, rounds: stats.current.asked, state: { ...stats.current, won } });
    setResult({ ...res, isBest });
  };

  const answer = (i) => {
    if (!turn || turn.chosen != null || phase !== "fight") return;
    clearInterval(timer.current);
    const correct = i === turn.question.answerIndex;
    game.record(turn.entry.id, correct);
    const { battle: b, damage, combo } = attack(battle, correct);
    stats.current.asked += 1;
    if (correct) stats.current.right += 1;
    stats.current.bestCombo = Math.max(stats.current.bestCombo, b.combo);
    setTurn({ ...turn, chosen: i });
    setBattle(b);

    if (correct) {
      arrow.value = 0;
      arrow.value = withTiming(1, { duration: 260 });
      bossFlash.value = withSequence(withTiming(0, { duration: 240 }), withTiming(1, { duration: 80 }), withTiming(0, { duration: 260 }));
      bossShift.value = withSequence(withTiming(0, { duration: 240 }), withTiming(10, { duration: 50 }), withTiming(-10, { duration: 50 }), withTiming(0, { duration: 60 }));
      setHit({ side: "boss", text: combo ? `COMBO −${damage}` : `−${damage}`, color: combo ? GOLD : GOLD_SOFT, key: Date.now() });
    } else {
      bossShift.value = withSequence(withTiming(-60, { duration: 160 }), withTiming(0, { duration: 220 }));
      playerShift.value = withSequence(withTiming(0, { duration: 140 }), withTiming(-12, { duration: 50 }), withTiming(10, { duration: 50 }), withTiming(0, { duration: 60 }));
      setHit({ side: "player", text: `−${damage} light`, color: RED, key: Date.now() });
    }

    const state = battleState(b);
    setTimeout(() => {
      setHit(null);
      if (state === "fighting") ask(b, queue, turn.index + 1);
      else if (state === "won") {
        stats.current.bossesBeaten += 1;
        setPhase("victory");
      } else {
        if (state === "champion") stats.current.bossesBeaten += 1;
        end(b, state === "champion");
      }
    }, correct ? NEXT_MS - 300 : NEXT_MS + 600);
  };

  // Running out of time is a miss.
  useEffect(() => {
    if (left === 0 && phase === "fight" && turn && turn.chosen == null) answer(-1);
  }, [left]);

  const fightOn = () => {
    const b = nextBoss(battle);
    setBattle(b);
    setPhase("fight");
    ask(b, queue, turn.index + 1);
  };

  let body;
  if (phase === "over" && result) {
    body = (
      <GameResults
        title={result.won ? "Every adversary overcome" : `Your lamp went out at ${BOSSES[result.level].name}`}
        score={result.xp}
        isBest={result.isBest}
        stats={[
          { value: result.bossesBeaten, label: "overcome", tone: colors.success },
          { value: `${result.right}/${result.asked}`, label: "right" },
          { value: result.bestCombo, label: "best combo" },
          { value: `${BOSSES[result.level].emoji} ${result.level + 1}`, label: "level reached" },
        ]}
        missedIds={game.missedIds()}
        bank={game.bank}
        lang={game.lang}
        signedIn={game.signedIn}
        onAgain={start}
      >
        {result.won ? (
          <View style={styles.championCross}>
            <CrossMenuIcon size={64} color={GOLD} ground={NIGHT} />
          </View>
        ) : (
          <Text style={styles.encourage}>Study the words you missed, then light it again.</Text>
        )}
      </GameResults>
    );
  } else if (phase === "fight" || phase === "victory") {
    const q = turn.question;
    const correct = turn.chosen === q.answerIndex;
    body = (
      <View style={styles.play}>
        <View style={styles.arena}>
          <View style={styles.bars}>
            <HealthBar value={battle.playerHp} max={PLAYER_HP} color={LIGHT} label="Your lamp" />
            <HealthBar value={battle.bossHp} max={battle.boss.hp} color={GOLD} label={`${battle.boss.name} · level ${battle.level + 1}`} />
          </View>
          <View style={[styles.fighters, compact && styles.fightersCompact]}>
            <Animated.View style={[styles.fighter, playerStyle]}>
              <Lamp light={Math.max(0, battle.playerHp / PLAYER_HP)} size={compact ? 46 : 60} />
              {hit?.side === "player" ? <Damage key={hit.key} hit={hit} /> : null}
            </Animated.View>
            <Animated.Text style={[styles.arrow, arrowStyle]}>✦</Animated.Text>
            <Animated.View style={[styles.fighter, bossStyle]}>
              <Text style={[styles.boss, compact && styles.bossCompact, phase === "victory" && styles.bossBeaten]}>{battle.boss.emoji}</Text>
              {hit?.side === "boss" ? <Damage key={hit.key} hit={hit} /> : null}
              {/* The cross rises over the beaten adversary. */}
              {phase === "victory" ? (
                <Animated.View entering={ZoomIn.duration(600)} style={styles.victoryCross}>
                  {victoryLight ? (
                    <View pointerEvents="none" style={[styles.rays, { left: (cross - RAYS) / 2, top: (cross - RAYS) / 2 }]}>
                      <LightRays size={RAYS} color={GOLD} />
                    </View>
                  ) : null}
                  <CrossMenuIcon size={cross} color={GOLD} ground={NIGHT} />
                </Animated.View>
              ) : null}
            </Animated.View>
          </View>
          <View style={styles.status}>
            <Text style={styles.statusText}>{battle.combo > 1 ? `🔥 ${battle.combo} in a row · every 5th is a combo strike` : `XP ${battle.xp}`}</Text>
            {phase === "fight" ? <Text style={[styles.statusText, left <= 3 && { color: RED }]}>{left}s</Text> : null}
          </View>

        </View>

        {phase === "victory" ? (
          <Animated.View entering={FadeIn.duration(300)} style={styles.victory}>
            <Text style={styles.victoryTitle}>Victory!</Text>
            <Text style={styles.victoryText}>
              {battle.boss.name} ({battle.boss.english}) is overcome. Next: {BOSSES[battle.level + 1].emoji} {BOSSES[battle.level + 1].name}
            </Text>
            <Button onPress={fightOn} style={styles.victoryButton}>
              Go on
            </Button>
          </Animated.View>
        ) : null}

        {phase === "fight" ? (
          <>
            <Animated.View key={turn.index} entering={FadeIn.duration(180)} style={styles.prompt}>
              <Text style={styles.ask}>
                {q.dir === "toGeez" ? "Which ግዕዝ verb means" : `What does it mean in ${LANGUAGE_LABEL[game.lang]}?`}
              </Text>
              <Text
                style={[
                  styles.promptText,
                  scriptFontBold(q.prompt),
                  compact && { fontSize: 28, lineHeight: 38 },
                  q.dir === "toGeez" && { fontSize: 20, lineHeight: 28 },
                ]}
              >
                {q.prompt}
              </Text>
            </Animated.View>
            <Choices options={q.options} answerIndex={q.answerIndex} chosen={turn.chosen} onPick={answer} geez={q.dir === "toGeez"} dark />
            {turn.chosen != null && !correct ? (
              <Animated.View entering={FadeIn.duration(200)} style={styles.lesson}>
                <Text style={styles.lessonWord}>{turn.entry.word}</Text>
                <Meanings entry={turn.entry} langs={[game.lang]} />
              </Animated.View>
            ) : null}
          </>
        ) : null}
      </View>
    );
  } else {
    body = (
      <StartCard
        emoji="🕯️"
        lead="Carry your lamp against four adversaries. Answer about ግዕዝ verbs to strike with its light; miss, or take too long, and your lamp dims. Overcome each one and the cross shines over it."
        rules={[
          `${BOSSES.map((b) => `${b.emoji} ${b.name}`).join(" → ")}: each tougher and faster`,
          "Every fifth right answer in a row is a combo strike",
          "Verbs you've missed before come first",
        ]}
        best={game.best}
        startLabel="Enter the battle"
        onStart={start}
      >
        <LanguagePicker lang={game.lang} onChange={game.setLang} />
        <FocusPicker game={game} />
      </StartCard>
    );
  }

  return (
    <GameFrame title="Verb Boss Battle" game={game}>
      {body}
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  play: { gap: spacing.md, maxWidth: 680, width: "100%", alignSelf: "center" },
  arena: { backgroundColor: NIGHT, borderRadius: radii.lg, borderWidth: 2, borderColor: "#3a2c17", padding: spacing.md, gap: spacing.md, overflow: "hidden" },
  bars: { flexDirection: "row", gap: spacing.lg },
  hp: { flex: 1, gap: 4 },
  hpHead: { flexDirection: "row", justifyContent: "space-between" },
  hpLabel: { fontFamily: fontFamily.ethiopicBold, fontSize: 13, color: GOLD_SOFT },
  hpNum: { fontFamily: fontFamily.latinSemiBold, fontSize: 12, color: "#c9b48a" },
  hpTrack: { height: 10, borderRadius: radii.pill, backgroundColor: "#3a2c17", overflow: "hidden" },
  hpFill: { height: 10, borderRadius: radii.pill },
  fighters: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, height: 130 },
  fighter: { alignItems: "center", justifyContent: "center", width: 110, height: 120 },
  boss: { fontSize: 84, lineHeight: 100 },
  bossCompact: { fontSize: 58, lineHeight: 70 },
  fightersCompact: { height: 88 },
  arrow: { position: "absolute", left: 120, fontSize: 30, color: LIGHT },
  lamp: { alignItems: "center", justifyContent: "flex-end", gap: 2 },
  flame: { borderRadius: 999, padding: 4 },
  lampBase: { height: 10, borderRadius: 999, backgroundColor: "#8a6a2c", borderTopWidth: 2, borderTopColor: GOLD },
  rays: { position: "absolute" },
  victoryCross: { position: "absolute", borderRadius: 999, boxShadow: "0 0 40px rgba(224,165,42,0.8)" },
  championCross: { alignSelf: "center", marginTop: spacing.sm, borderRadius: 999, boxShadow: "0 0 32px rgba(224,165,42,0.6)" },
  encourage: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
  damage: { position: "absolute", fontFamily: fontFamily.latinBold, fontSize: 22 },
  damageBoss: { top: -6 },
  damagePlayer: { top: -6 },
  status: { flexDirection: "row", justifyContent: "space-between" },
  statusText: { fontFamily: fontFamily.latinSemiBold, fontSize: 13, color: "#c9b48a" },
  victory: {
    backgroundColor: NIGHT,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  victoryButton: { alignSelf: "stretch", marginTop: spacing.xs },
  bossBeaten: { opacity: 0.25 },
  victoryTitle: { fontFamily: fontFamily.latinBold, fontSize: 32, color: GOLD },
  victoryText: { fontFamily: fontFamily.ethiopicRegular, fontSize: 15, color: GOLD_SOFT, textAlign: "center" },
  prompt: { alignItems: "center", gap: 4 },
  ask: { ...typography.label, color: colors.textMuted },
  promptText: { fontSize: 36, lineHeight: 50, color: colors.textPrimary, textAlign: "center" },
  lesson: { borderRadius: radii.md, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.accentLight, padding: spacing.md, gap: 2 },
  lessonWord: { fontFamily: fontFamily.ethiopicBold, fontSize: 20, color: colors.textPrimary },
});
