import { View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { colors } from "../../theme";

const TICK_COUNT = 8;

export function OrnamentFrame({ size = 40, active = false, children }) {
  const strokeColor = active ? colors.borderGold : colors.textMuted;
  const fillColor = active ? colors.primaryLight : "transparent";
  const center = size / 2;
  const outerR = size / 2 - 2;
  const innerR = outerR - 4;

  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const angle = (i * 360) / TICK_COUNT;
    const rad = (angle * Math.PI) / 180;
    return {
      key: i,
      x1: center + innerR * Math.cos(rad),
      y1: center + innerR * Math.sin(rad),
      x2: center + outerR * Math.cos(rad),
      y2: center + outerR * Math.sin(rad),
    };
  });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute" }}>
        <Circle
          cx={center}
          cy={center}
          r={outerR}
          stroke={strokeColor}
          strokeWidth={1.5}
          fill={fillColor}
          opacity={active ? 1 : 0.5}
        />
        <Circle
          cx={center}
          cy={center}
          r={innerR}
          stroke={strokeColor}
          strokeWidth={1}
          fill="none"
          opacity={active ? 0.8 : 0.4}
        />
        {ticks.map((t) => (
          <Line
            key={t.key}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={strokeColor}
            strokeWidth={1}
            opacity={active ? 0.9 : 0.4}
          />
        ))}
      </Svg>
      {children}
    </View>
  );
}
