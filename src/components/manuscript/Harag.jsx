import { useId, useState } from "react";
import { View } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from "react-native-svg";
import { colors } from "../../theme";

// A cubic Bézier that matches half a sine wave puts its control points this far along.
const K = 4 / (3 * Math.PI);
const CROSS = "#FFF7E6";

const BOOK = () => ({ a: colors.rubric, b: colors.ochre, dots: [colors.lapis, colors.malachite], rule: colors.rubric, outline: colors.soot });
const GOLD = () => ({ a: colors.gold, b: colors.ochre, dots: [colors.gold, colors.ochre], rule: colors.gold, outline: colors.soot });

// One strand of the braid: half waves of length `half`, alternately above and below the middle.
function strand(length, half, mid, amp, sign) {
  const h = (4 / 3) * amp;
  let d = `M0 ${mid.toFixed(2)}`;
  for (let x = 0, s = sign; x < length - 0.01; x += half, s = -s) {
    const y = (mid + s * h).toFixed(2);
    d += ` C${(x + K * half).toFixed(2)} ${y} ${(x + (1 - K) * half).toFixed(2)} ${y} ${(x + half).toFixed(2)} ${mid.toFixed(2)}`;
  }
  return d;
}

// Two strands crossing over and under, with a painted dot in each eye.
function Braid({ length, t, p, clipId }) {
  const rule = Math.max(1, t * 0.07);
  const mid = t / 2;
  const sw = t * 0.2;
  const amp = mid - rule * 2 - sw / 2 - 0.5;
  const pairs = Math.max(1, Math.round(length / (t * 1.8)));
  const half = length / (pairs * 2);
  const a = strand(length, half, mid, amp, 1);
  const b = strand(length, half, mid, amp, -1);
  const crossings = Array.from({ length: pairs }, (_, i) => (2 * i + 1) * half);
  const dot = Math.min(amp * 0.42, half * 0.16);
  return (
    <>
      <Defs>
        <ClipPath id={clipId}>
          {crossings.map((x) => (
            <Rect key={x} x={x - half / 2} y={0} width={half} height={t} />
          ))}
        </ClipPath>
      </Defs>
      <Path d={`M0 ${rule / 2} H${length} M0 ${t - rule / 2} H${length}`} stroke={p.rule} strokeWidth={rule} />
      {t >= 16
        ? Array.from({ length: pairs * 2 }, (_, i) => (
            <Circle key={i} cx={(i + 0.5) * half} cy={mid} r={dot} fill={p.dots[i % 2]} />
          ))
        : null}
      <Path d={a} stroke={p.outline} strokeWidth={sw + 1.6} fill="none" />
      <Path d={a} stroke={p.a} strokeWidth={sw} fill="none" />
      <Path d={b} stroke={p.outline} strokeWidth={sw + 1.6} fill="none" />
      <Path d={b} stroke={p.b} strokeWidth={sw} fill="none" />
      {/* Strand a goes back over b at every other crossing, so the strands weave. */}
      <G clipPath={`url(#${clipId})`}>
        <Path d={a} stroke={p.outline} strokeWidth={sw + 1.6} fill="none" />
        <Path d={a} stroke={p.a} strokeWidth={sw} fill="none" />
      </G>
    </>
  );
}

// Painted squares in the four pigments, each with a cross, between two red rules.
function Checker({ length, t, p }) {
  const rule = Math.max(1, t * 0.07);
  const top = rule * 2;
  const inner = t - rule * 4;
  const count = Math.max(1, Math.round(length / inner));
  const w = length / count;
  const fills = [p.a, p.b, p.dots[1], p.dots[0]];
  const arm = inner * 0.26;
  const bar = Math.max(1, inner * 0.14);
  return (
    <>
      <Path d={`M0 ${rule / 2} H${length} M0 ${t - rule / 2} H${length}`} stroke={p.rule} strokeWidth={rule} />
      {Array.from({ length: count }, (_, i) => {
        const cx = i * w + w / 2;
        const cy = top + inner / 2;
        return (
          <G key={i}>
            <Rect x={i * w} y={top} width={w} height={inner} fill={fills[i % 4]} stroke={p.outline} strokeWidth={0.8} />
            <Rect x={cx - arm} y={cy - bar / 2} width={arm * 2} height={bar} fill={CROSS} />
            <Rect x={cx - bar / 2} y={cy - arm} width={bar} height={arm * 2} fill={CROSS} />
          </G>
        );
      })}
    </>
  );
}

// A thin cord for tight places (the tab bar): two red rules with painted pearls between.
function Pearls({ length, t, p }) {
  const r = Math.max(1, ((t - 4) / 2) * 0.8);
  const step = r * 4;
  const count = Math.max(1, Math.floor(length / step));
  const start = (length - (count - 1) * step) / 2;
  const fills = [p.a, p.b, p.dots[1], p.dots[0]];
  return (
    <>
      <Path d={`M0 0.5 H${length} M0 ${t - 0.5} H${length}`} stroke={p.rule} strokeWidth={1} />
      {Array.from({ length: count }, (_, i) => (
        <Circle key={i} cx={start + i * step} cy={t / 2} r={r} fill={fills[i % 4]} />
      ))}
    </>
  );
}

// ሐረግ: the woven bands that open chapters in Ethiopian books, drawn as SVG across
// whatever length it is given, so it stays sharp and weighs a few KB. pattern "braid"
// (two strands over and under), "checker" (painted squares with crosses) or "pearls"
// (a thin cord, for bands under 10 px); vertical
// bands run down the page's edges. tone "gold" gilds it. Decoration only, so screen
// readers skip it.
export function Harag({ pattern = "braid", thickness = 14, vertical = false, tone = "book", style }) {
  const [length, setLength] = useState(0);
  const clipId = `harag${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const p = tone === "gold" ? GOLD() : BOOK();
  const t = thickness;
  const size = vertical ? { width: t, alignSelf: "stretch" } : { height: t, alignSelf: "stretch" };
  return (
    <View
      style={[size, style]}
      onLayout={(e) => setLength(Math.round(vertical ? e.nativeEvent.layout.height : e.nativeEvent.layout.width))}
      accessible={false}
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      {length > 0 ? (
        <Svg width={vertical ? t : length} height={vertical ? length : t}>
          <G transform={vertical ? `translate(${t},0) rotate(90)` : undefined}>
            {pattern === "checker" ? (
              <Checker length={length} t={t} p={p} />
            ) : pattern === "pearls" ? (
              <Pearls length={length} t={t} p={p} />
            ) : (
              <Braid length={length} t={t} p={p} clipId={clipId} />
            )}
          </G>
        </Svg>
      ) : null}
    </View>
  );
}
