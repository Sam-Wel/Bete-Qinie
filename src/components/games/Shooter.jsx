import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { CrossMenuIcon } from "../ui/CrossMenuIcon";
import { LANGUAGE_LABEL } from "../../lib/verbQuiz";
import { BOTTOM, COUNTDOWN, EVENT_MS, LANES, LIVES, levelOf, liveEvents, multiplier, shoot, step } from "../../lib/shooter";
import { colors, fontFamily, radii, spacing } from "../../theme";
import { scriptFont, scriptFontBold } from "../verbQuiz/shared";

// The field is drawn like the gold-on-black cross: a night ground, gold verbs.
const NIGHT = "#17110a";
const NIGHT_EDGE = "#3a2c17";
const GOLD = "#e0a52a";
const GOLD_SOFT = "#f6e2ac";
const RED = "#d0553c";
const GREEN = "#7fb069";

const ENEMY_H = 52;
const SHOT_MS = 220;
const BURST_MS = 420;
const SHAKE_MS = 360;
const MAX_FONT = 20;
const MIN_FONT = 11;

// Web ignores React Native's shrink-to-fit, so verbs are sized by length to
// fit their lane: one line when that stays readable, otherwise two smaller
// lines, breaking after a "/" between spellings, at a space, or mid-word.
const GLYPH = 0.9; // Ethiopic glyph width as a fraction of the font size
const READABLE = 15;

export function fitVerb(text, boxWidth) {
  const room = boxWidth - 14;
  const chars = [...text].length;
  const oneLine = room / (chars * GLYPH);
  if (oneLine >= READABLE) {
    const fontSize = Math.min(MAX_FONT, oneLine);
    return { text, fontSize, lineHeight: Math.round(fontSize * 1.4), lines: 1 };
  }
  const fontSize = Math.max(MIN_FONT, Math.min(16, room / (Math.ceil(chars / 2) * GLYPH)));
  return { text: text.replace(/\//g, "/\u200b"), fontSize, lineHeight: Math.round(fontSize * 1.2), lines: 2 };
}

function Lives({ lives }) {
  return (
    <View style={styles.lives}>
      {Array.from({ length: LIVES }, (_, i) => (
        <View key={i} style={{ opacity: i < lives ? 1 : 0.22 }}>
          <CrossMenuIcon size={22} color={GOLD} ground={NIGHT} />
        </View>
      ))}
    </View>
  );
}

const fade = (age) => Math.max(0, 1 - age / EVENT_MS);

// One game of ቀስት, from the countdown until the last cross is lost.
export function Shooter({ initialGame, bank, onAnswer, onOver }) {
  const game = useRef(initialGame);
  const [, redraw] = useReducer((n) => n + 1, 0);
  const [paused, setPaused] = useState(false);
  const [width, setWidth] = useState(0);
  const { height: screenH } = useWindowDimensions();
  const height = Math.max(400, Math.min(560, screenH - 230));

  // Callbacks change identity on every parent render; the loop reads the latest.
  const handlers = useRef({ onAnswer, onOver });
  handlers.current = { onAnswer, onOver };

  const stars = useMemo(
    () => Array.from({ length: 44 }, () => ({ x: Math.random(), y: Math.random() * BOTTOM, r: Math.random() * 1.2 + 0.4 })),
    []
  );

  useEffect(() => {
    if (paused) return undefined;
    let frame;
    let last = null;
    const tick = (now) => {
      const dt = last == null ? 0 : Math.min(50, now - last);
      last = now;
      const result = step(game.current, dt);
      game.current = result.game;
      if (result.answer) handlers.current.onAnswer(result.answer);
      redraw();
      if (result.game.over) {
        handlers.current.onOver(result.game);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused]);

  const fire = (lane) => {
    if (paused) return;
    const result = shoot(game.current, lane);
    game.current = result.game;
    if (result.answer) handlers.current.onAnswer(result.answer);
    redraw();
  };

  useEffect(() => {
    if (Platform.OS !== "web") return undefined;
    const onKey = (event) => {
      if (/^[1-4]$/.test(event.key)) fire(Number(event.key) - 1);
      else if (event.key === "p" || event.key === "Escape") setPaused((p) => !p);
    };
    const onHide = () => document.hidden && setPaused(true);
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onHide);
    };
  });

  const g = game.current;
  const { wave } = g;
  const laneW = width / LANES;
  const boxW = laneW - 8;
  const bowX = width / 2;
  const bowY = BOTTOM * height;
  const target = wave.enemies[wave.question.answerIndex];
  const answerEntry = bank.byId[wave.question.wordId];
  const events = liveEvents(g);
  const escape = events.find((e) => e.type === "escape");
  const shakeAge = escape ? g.t - escape.at : Infinity;
  const shake = shakeAge < SHAKE_MS ? Math.sin(shakeAge / 22) * 7 * (1 - shakeAge / SHAKE_MS) : 0;
  const banner = [...events].reverse().find((e) => ["level", "life", "streak"].includes(e.type));
  const counting = g.t < 0;

  return (
    <View>
      <View style={styles.hud}>
        <View>
          <Text style={styles.score}>{g.score}</Text>
          <Text style={styles.hudLabel}>
            level {levelOf(wave.number)} · wave {wave.number}
          </Text>
        </View>
        <Lives lives={g.lives} />
      </View>

      <View
        style={[
          styles.field,
          { height, transform: [{ translateX: shake }] },
          escape && shakeAge < 700 && styles.fieldHurt,
        ]}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {width ? (
          <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
            {stars.map((s, i) => (
              <Circle key={i} cx={s.x * width} cy={s.y * height} r={s.r} fill={GOLD_SOFT} opacity={0.35} />
            ))}
            <Line x1={0} x2={width} y1={bowY} y2={bowY} stroke={NIGHT_EDGE} strokeWidth={1} strokeDasharray="4 6" />
            {g.shots
              .filter((s) => g.t - s.at < SHOT_MS)
              .map((s, i) => (
                <Line
                  key={i}
                  x1={bowX}
                  y1={bowY}
                  x2={laneW * (s.lane + 0.5)}
                  y2={s.y * height + ENEMY_H / 2}
                  stroke={GOLD}
                  strokeWidth={3}
                  strokeLinecap="round"
                  opacity={1 - (g.t - s.at) / SHOT_MS}
                />
              ))}
            {wave.outcome === "hit" && g.t - wave.endedAt < BURST_MS
              ? [0, 0.35].map((delay) => {
                  const p = Math.max(0, (g.t - wave.endedAt) / BURST_MS - delay);
                  return (
                    <Circle
                      key={delay}
                      cx={laneW * (target.lane + 0.5)}
                      cy={target.y * height + ENEMY_H / 2}
                      r={18 + p * 60}
                      fill="none"
                      stroke={delay ? GOLD : GREEN}
                      strokeWidth={4 - p * 3}
                      opacity={Math.max(0, 1 - p)}
                    />
                  );
                })
              : null}
          </Svg>
        ) : null}

        {width
          ? wave.enemies.map((enemy) => {
              const isTarget = enemy.lane === wave.question.answerIndex;
              const hit = wave.outcome === "hit" && isTarget;
              const fading = wave.outcome && !isTarget;
              const flashing = enemy.wrongAt != null && g.t - enemy.wrongAt < 500;
              const escapedTarget = wave.outcome === "escaped" && isTarget;
              if (hit && g.t - wave.endedAt > 160) return null;
              const fit = fitVerb(enemy.text, boxW);
              return (
                <Pressable
                  key={enemy.lane}
                  onPress={() => fire(enemy.lane)}
                  style={({ hovered }) => [
                    styles.enemy,
                    { left: laneW * enemy.lane + 4, width: boxW, top: Math.min(enemy.y, BOTTOM) * height, opacity: fading ? 0.25 : 1 },
                    hovered && !wave.outcome && enemy.wrongAt == null && styles.enemyHover,
                    enemy.wrongAt != null && styles.enemyWrong,
                    flashing && styles.enemyFlash,
                    (hit || escapedTarget) && styles.enemyRight,
                  ]}
                >
                  <Text style={styles.laneKey}>{enemy.lane + 1}</Text>
                  <Text
                    style={[
                      styles.enemyText,
                      scriptFontBold(enemy.text),
                      { fontSize: fit.fontSize, lineHeight: fit.lineHeight },
                      fit.lines > 1 && Platform.OS === "web" && { wordBreak: "break-word" },
                      enemy.wrongAt != null && { color: RED },
                    ]}
                    numberOfLines={fit.lines}
                  >
                    {fit.text}
                  </Text>
                </Pressable>
              );
            })
          : null}

        {/* Points float up from each hit. */}
        {width
          ? events
              .filter((e) => e.type === "hit" || e.type === "streak")
              .map((e) => {
                const age = g.t - e.at;
                const x = e.type === "hit" ? laneW * (e.lane + 0.5) : width / 2;
                const y = (e.type === "hit" ? e.y * height : height * 0.35) - (age / EVENT_MS) * 50;
                return (
                  <Text
                    key={e.at + e.type}
                    pointerEvents="none"
                    style={[styles.pop, { left: x - 50, top: y, opacity: fade(age) }]}
                  >
                    {`+${e.points}`}
                  </Text>
                );
              })
          : null}

        {banner ? (
          <View pointerEvents="none" style={[styles.banner, { opacity: fade(g.t - banner.at) }]}>
            <Text style={styles.bannerText}>
              {banner.type === "level"
                ? `Level ${banner.level} · faster`
                : banner.type === "life"
                  ? "10 in a row · a cross back"
                  : "10 in a row · +50"}
            </Text>
          </View>
        ) : null}

        {g.combo > 1 && !counting ? (
          <View pointerEvents="none" style={[styles.combo, { top: bowY - 34 }]}>
            <Text style={styles.comboText}>{`×${multiplier(g.combo)}`}</Text>
            <Text style={styles.comboSub}>{g.combo} in a row</Text>
          </View>
        ) : null}

        <View style={[styles.promptBar, { top: bowY + 6 }]}>
          {wave.outcome === "escaped" ? (
            <Text style={styles.escaped} numberOfLines={2}>
              <Text style={scriptFontBold(answerEntry.word)}>{answerEntry.word}</Text>
              <Text style={scriptFont(wave.question.prompt)}>{`  =  ${wave.question.prompt}`}</Text>
            </Text>
          ) : (
            <>
              <Text style={styles.promptLang}>{LANGUAGE_LABEL[g.lang]} · which verb means</Text>
              <Text style={[styles.prompt, scriptFontBold(wave.question.prompt)]} numberOfLines={2}>
                {wave.question.prompt}
              </Text>
            </>
          )}
        </View>

        {counting ? (
          <View pointerEvents="none" style={styles.countdown}>
            <Text style={styles.countdownNumber}>{Math.ceil(-g.t / (COUNTDOWN / 3))}</Text>
            <Text style={styles.countdownHint}>Read the meaning below</Text>
          </View>
        ) : null}

        {paused ? (
          <Pressable style={styles.pauseCover} onPress={() => setPaused(false)}>
            <Text style={styles.pauseTitle}>Paused</Text>
            <Text style={styles.pauseHint}>Tap to carry on</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Pressable onPress={() => setPaused((p) => !p)} hitSlop={8}>
          <Text style={styles.footerLink}>{paused ? "Resume" : "Pause"}</Text>
        </Pressable>
        {Platform.OS === "web" ? <Text style={styles.footerHint}>Tap a verb, or keys 1–4 · P to pause</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: spacing.sm },
  score: { fontFamily: fontFamily.latinBold, fontSize: 28, lineHeight: 32, color: colors.textPrimary },
  hudLabel: { fontFamily: fontFamily.latinSemiBold, fontSize: 13, color: colors.textMuted },
  lives: { flexDirection: "row", gap: 4 },
  field: {
    backgroundColor: NIGHT,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: NIGHT_EDGE,
    overflow: "hidden",
  },
  fieldHurt: { borderColor: RED },
  enemy: {
    position: "absolute",
    height: ENEMY_H,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: GOLD,
    backgroundColor: "#241a0d",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    overflow: "hidden",
  },
  enemyHover: { backgroundColor: "#33250f" },
  enemyWrong: { borderColor: RED, backgroundColor: "#2a120c" },
  enemyFlash: { backgroundColor: "#5a1e12" },
  enemyRight: { borderColor: GREEN, backgroundColor: "#1d2b14" },
  laneKey: {
    position: "absolute",
    top: 2,
    left: 5,
    fontFamily: fontFamily.latinSemiBold,
    fontSize: 10,
    color: "#8a6d47",
  },
  enemyText: { color: GOLD_SOFT, textAlign: "center" },
  pop: {
    position: "absolute",
    width: 100,
    textAlign: "center",
    fontFamily: fontFamily.latinBold,
    fontSize: 18,
    color: GOLD,
  },
  banner: {
    position: "absolute",
    top: "38%",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bannerText: {
    fontFamily: fontFamily.latinBold,
    fontSize: 20,
    color: GOLD_SOFT,
    backgroundColor: "rgba(224,165,42,0.18)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  combo: { position: "absolute", right: spacing.md, alignItems: "flex-end" },
  comboText: { fontFamily: fontFamily.latinBold, fontSize: 22, lineHeight: 24, color: GOLD },
  comboSub: { fontFamily: fontFamily.latinRegular, fontSize: 11, color: "#c9b48a" },
  promptBar: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  promptLang: { fontFamily: fontFamily.ethiopicRegular, fontSize: 11, color: "#8a6d47" },
  prompt: { fontSize: 20, lineHeight: 28, color: GOLD, textAlign: "center" },
  escaped: { fontSize: 18, lineHeight: 26, color: GREEN, textAlign: "center" },
  countdown: { ...StyleSheet.absoluteFillObject, bottom: "20%", alignItems: "center", justifyContent: "center", gap: 4 },
  countdownNumber: { fontFamily: fontFamily.latinBold, fontSize: 72, lineHeight: 80, color: GOLD },
  countdownHint: { fontFamily: fontFamily.latinRegular, fontSize: 14, color: "#c9b48a" },
  pauseCover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(23,17,10,0.82)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  pauseTitle: { fontFamily: fontFamily.latinBold, fontSize: 26, color: GOLD_SOFT },
  pauseHint: { fontFamily: fontFamily.latinRegular, fontSize: 14, color: "#c9b48a" },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm, flexWrap: "wrap", gap: spacing.sm },
  footerLink: { fontFamily: fontFamily.latinSemiBold, fontSize: 14, color: colors.primaryDark, textDecorationLine: "underline" },
  footerHint: { fontFamily: fontFamily.latinRegular, fontSize: 13, color: colors.textMuted },
});
