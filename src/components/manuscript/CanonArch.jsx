import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors, spacing } from "../../theme";

const RISE = 30;
const BAND = 7;

// A table under an arch, like the canon tables at the front of a Gospel book: a painted
// arch with a cross at its crown, standing on two columns. Wraps whatever table it is
// given (the ርባታ forms); the arch is decoration, so screen readers skip it.
export function CanonArch({ children, style }) {
  const [w, setW] = useState(0);
  const rx = w / 2;
  // The arch's painted band: over the top along the outer curve, back along the inner one.
  const band = `M0 ${RISE} A${rx} ${RISE - 6} 0 0 1 ${w} ${RISE} L${w - BAND} ${RISE} A${rx - BAND} ${RISE - 6 - BAND} 0 0 0 ${BAND} ${RISE} Z`;
  const dots = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI - ((i + 1) / 10) * Math.PI;
    return { x: rx + (rx - BAND / 2) * Math.cos(a), y: RISE - (RISE - 6 - BAND / 2) * Math.sin(a), c: i % 2 ? colors.malachite : colors.lapis };
  });
  return (
    <View style={style} onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
      <View style={{ height: RISE + 2 }} aria-hidden accessible={false}>
        {w ? (
          <Svg width={w} height={RISE + 2}>
            <Path d={band} fill={colors.ochre} stroke={colors.rubric} strokeWidth={1.2} />
            {dots.map((d, i) => (
              <Circle key={i} cx={d.x} cy={d.y} r={1.8} fill={d.c} />
            ))}
            {/* The cross at the crown. */}
            <Rect x={rx - 1.2} y={0} width={2.4} height={9} fill={colors.rubric} />
            <Rect x={rx - 4} y={2.6} width={8} height={2.4} fill={colors.rubric} />
          </Svg>
        ) : null}
      </View>
      <View
        style={{
          borderLeftWidth: 3,
          borderRightWidth: 3,
          borderBottomWidth: 2,
          borderColor: colors.rubric,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
          marginTop: -2,
        }}
      >
        {children}
      </View>
    </View>
  );
}
