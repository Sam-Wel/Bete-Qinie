import Svg, { Circle, Rect } from "react-native-svg";
import { colors } from "../../theme";

// An Ethiopian Orthodox processional-cross silhouette -- equal arms
// flaring into trefoil (three-lobed) tips around a central boss where
// the arms cross -- used as the menu toggle instead of a generic
// hamburger icon.
export function CrossMenuIcon({ size = 26, color = colors.primary }) {
  const vb = 100;
  const c = 50;
  const armHalf = 7;
  const inset = 14;
  const mainR = 9;
  const sideR = 6;

  const tips = [
    { main: [c, inset], sides: [[c - 9, inset + 2], [c + 9, inset + 2]] }, // top
    { main: [c, vb - inset], sides: [[c - 9, vb - inset - 2], [c + 9, vb - inset - 2]] }, // bottom
    { main: [inset, c], sides: [[inset + 2, c - 9], [inset + 2, c + 9]] }, // left
    { main: [vb - inset, c], sides: [[vb - inset - 2, c - 9], [vb - inset - 2, c + 9]] }, // right
  ];

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`}>
      <Rect x={c - armHalf} y={inset} width={armHalf * 2} height={vb - inset * 2} fill={color} />
      <Rect x={inset} y={c - armHalf} width={vb - inset * 2} height={armHalf * 2} fill={color} />
      {tips.map((tip, i) => (
        <Circle key={`main-${i}`} cx={tip.main[0]} cy={tip.main[1]} r={mainR} fill={color} />
      ))}
      {tips.flatMap((tip, i) =>
        tip.sides.map((pos, j) => (
          <Circle key={`side-${i}-${j}`} cx={pos[0]} cy={pos[1]} r={sideR} fill={color} />
        ))
      )}
      <Circle cx={c} cy={c} r={10} fill={color} />
    </Svg>
  );
}
