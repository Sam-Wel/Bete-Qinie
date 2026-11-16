import { useEffect } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { buzz } from "../../lib/motion";

// Wraps one answer option so a pick is felt as well as seen: the right answer pops (more
// when it was the one picked), a wrong pick shakes. A light buzz too, where the phone
// allows it. Reanimated skips the motion when Reduce Motion is on.
// state: null | "right" | "wrong" | "dim"; picked: this option was the one chosen.
export function AnswerMotion({ state, picked, style, children }) {
  const scale = useSharedValue(1);
  const shift = useSharedValue(0);

  useEffect(() => {
    if (state === "right") {
      scale.value = withSequence(withTiming(picked ? 1.05 : 1.025, { duration: 120 }), withSpring(1, { damping: 12, stiffness: 320 }));
      if (picked) buzz(14);
    } else if (state === "wrong") {
      shift.value = withSequence(
        withTiming(-9, { duration: 50 }),
        withTiming(9, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(4, { duration: 50 }),
        withTiming(0, { duration: 40 })
      );
      buzz([25, 40, 25]);
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { translateX: shift.value }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
