import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import { colors, fontFamily, spacing, typography } from "../../theme";

const HEIGHT = 160;
const PAD = { left: 36, right: 12, top: 12, bottom: 22 };

const shortDate = (time) => new Date(time).toLocaleDateString(undefined, { month: "short", day: "numeric" });

// First-try accuracy of the latest quizzes. A single quiz still gets a labelled
// point in the middle rather than a sliver at the edge.
export function AccuracyChart({ runs }) {
  const [width, setWidth] = useState(0);
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  const points = runs.map((run, i) => ({
    x: PAD.left + (runs.length === 1 ? plotW / 2 : (i / (runs.length - 1)) * plotW),
    y: PAD.top + (1 - (run.total ? run.correct / run.total : 0)) * plotH,
    run,
  }));
  const last = points[points.length - 1];

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: HEIGHT }}>
      {width ? (
        <Svg width={width} height={HEIGHT}>
          {[0, 0.5, 1].map((v) => {
            const y = PAD.top + (1 - v) * plotH;
            return (
              <Line key={v} x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} stroke={colors.border} strokeWidth={1} />
            );
          })}
          {[0, 0.5, 1].map((v) => (
            <SvgText
              key={`l${v}`}
              x={PAD.left - 6}
              y={PAD.top + (1 - v) * plotH + 4}
              fontSize={11}
              fontFamily={fontFamily.latinRegular}
              fill={colors.textMuted}
              textAnchor="end"
            >
              {`${v * 100}%`}
            </SvgText>
          ))}
          {points.length > 1 ? (
            <Polyline
              points={points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={colors.primary}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          ) : null}
          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={p === last ? 5 : 3} fill={p === last ? colors.primaryDark : colors.primary} />
          ))}
          {last ? (
            <SvgText
              x={last.x}
              y={Math.max(last.y - 10, 10)}
              fontSize={12}
              fontFamily={fontFamily.latinSemiBold}
              fill={colors.primaryDark}
              textAnchor={points.length === 1 ? "middle" : "end"}
            >
              {`${Math.round((last.run.correct / Math.max(1, last.run.total)) * 100)}%`}
            </SvgText>
          ) : null}
        </Svg>
      ) : null}
      {runs.length ? (
        <View style={[styles.dates, { left: PAD.left, right: PAD.right }]}>
          <Text style={styles.date}>{shortDate(runs[0].at)}</Text>
          {runs.length > 1 ? <Text style={styles.date}>{shortDate(runs[runs.length - 1].at)}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dates: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  date: { ...typography.caption, color: colors.textMuted },
});
