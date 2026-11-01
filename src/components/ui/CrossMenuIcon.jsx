import Svg, { Circle, G, Path, Polygon } from "react-native-svg";
import { colors } from "../../theme";

// An Ethiopian Orthodox processional (hand) cross: three diamond panels
// filled with rings around a square cross that has a plain cross cut
// through it, two looped "ears" at its foot, and a tapering staff. Drawn
// simply enough to stay readable at menu-button size.
const W = 100;
const H = 132;

function Panel({ cx, cy, r, color, ground }) {
  const ring = 0.52 * r;
  return (
    <G>
      <Polygon
        points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
        fill={color}
      />
      {/* Inner ground, with a ring of beads and a centre stone left in gold. */}
      <Polygon
        points={`${cx},${cy - r + 6} ${cx + r - 6},${cy} ${cx},${cy + r - 6} ${cx - r + 6},${cy}`}
        fill={ground}
      />
      {[
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
        [0.5, -0.5],
        [0.5, 0.5],
        [-0.5, 0.5],
        [-0.5, -0.5],
      ].map(([dx, dy], i) => (
        <Circle key={i} cx={cx + dx * ring} cy={cy + dy * ring} r={2.4} fill={color} />
      ))}
      <Polygon
        points={`${cx},${cy - 0.22 * r} ${cx + 0.22 * r},${cy} ${cx},${cy + 0.22 * r} ${cx - 0.22 * r},${cy}`}
        fill={color}
      />
    </G>
  );
}

export function CrossMenuIcon({ size = 26, color = colors.primary, ground = colors.primaryLight }) {
  return (
    <Svg width={(size * W) / H} height={size} viewBox={`0 0 ${W} ${H}`}>
      <Panel cx={50} cy={20} r={19} color={color} ground={ground} />
      <Panel cx={20} cy={53} r={18} color={color} ground={ground} />
      <Panel cx={80} cy={53} r={18} color={color} ground={ground} />

      {/* Square cross with a plain cross cut through it. */}
      <Path
        fillRule="evenodd"
        fill={color}
        d={[
          "M42 37 H58 V45 H66 V61 H58 V69 H42 V61 H34 V45 H42 Z",
          "M48.3 42 V66 H51.7 V42 Z",
          "M39 51.3 V54.7 H61 V51.3 Z",
        ].join(" ")}
      />

      {/* The two looped ears at the foot of the cross. */}
      <Path
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinejoin="round"
        d="M46 74 C40 70 26 70 26 79 C26 88 40 88 46 84 M54 74 C60 70 74 70 74 79 C74 88 60 88 54 84"
      />

      {/* The staff, tapering up to a point inside the ears. */}
      <Path fill={color} d="M50 66 C54 71 56 78 56 86 L58 128 Q50 131 42 128 L44 86 C44 78 46 71 50 66 Z" />
      <Path fill={ground} d="M43.4 104 H56.6 V107 H43.4 Z" />
    </Svg>
  );
}
