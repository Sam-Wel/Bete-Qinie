import { useEffect, useId } from "react";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Defs, Path, RadialGradient, Stop } from "react-native-svg";
import { useReducedMotion } from "../../lib/motion";

// Rays of light fading out from the centre, as behind a cross in the paintings. They turn
// a little as they appear and then hold still (nothing keeps moving); with Reduce Motion
// they are simply there.
export function LightRays({ size = 220, color = "#F2C14E", count = 12 }) {
  const reduced = useReducedMotion();
  const grow = useSharedValue(reduced ? 1 : 0);
  const id = `rays${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  useEffect(() => {
    if (!reduced) grow.value = withTiming(1, { duration: 5000, easing: Easing.out(Easing.quad) });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, grow.value * 3),
    transform: [{ rotate: `${24 * grow.value}deg` }, { scale: 0.7 + 0.3 * grow.value }],
  }));
  const c = size / 2;
  const half = Math.PI / count / 2.4;
  const rays = Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    const x1 = c + c * Math.cos(a - half);
    const y1 = c + c * Math.sin(a - half);
    const x2 = c + c * Math.cos(a + half);
    const y2 = c + c * Math.sin(a + half);
    return `M${c} ${c} L${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
  });
  return (
    <Animated.View pointerEvents="none" aria-hidden accessible={false} style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.85} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {rays.map((d) => (
          <Path key={d} d={d} fill={`url(#${id})`} />
        ))}
      </Svg>
    </Animated.View>
  );
}
