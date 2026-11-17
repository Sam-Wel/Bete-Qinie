import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Harag } from "./Harag";
import { useReducedMotion } from "../../lib/motion";

// A day's progress as a ሐረግ that weaves itself: the whole band is there faintly, and
// it is painted in, link by link, as words are learned. When the day is done it turns
// to gold. Read by screen readers as a progress bar.
export function HaragProgress({ value, total, thickness = 18, label = "Today's words" }) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const fraction = total ? Math.min(1, value / total) : 0;
  const done = total > 0 && value >= total;
  const shown = useSharedValue(fraction);
  const gold = useSharedValue(done ? 1 : 0);

  useEffect(() => {
    shown.value = reduced ? fraction : withTiming(fraction, { duration: 520, easing: Easing.out(Easing.cubic) });
    gold.value = reduced ? (done ? 1 : 0) : withTiming(done ? 1 : 0, { duration: done ? 700 : 200 });
  }, [fraction, done, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  const woven = useAnimatedStyle(() => ({ width: shown.value * width }));
  const gilded = useAnimatedStyle(() => ({ opacity: gold.value }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: thickness, alignSelf: "stretch" }}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: total, now: value, text: `${value} of ${total}` }}
    >
      <Harag thickness={thickness} style={{ position: "absolute", left: 0, right: 0, opacity: 0.2 }} />
      {width ? (
        <>
          <Animated.View style={[{ position: "absolute", left: 0, top: 0, height: thickness, overflow: "hidden" }, woven]}>
            <Harag thickness={thickness} style={{ width }} />
          </Animated.View>
          <Animated.View style={[{ position: "absolute", left: 0, top: 0, height: thickness, width }, gilded]}>
            <Harag thickness={thickness} tone="gold" style={{ width }} />
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}
