import { useEffect } from "react";
import Animated, { Easing, FadeInRight, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useLabPiece } from "../../hooks/useLab";
import { useReducedMotion } from "../../lib/motion";

// A card that turns in like a page around its left edge (the lab's "page turn").
// Remount it (a new key) for each new card.
export function FolioTurn({ style, children }) {
  const reduced = useReducedMotion();
  const turned = useSharedValue(reduced ? 0 : 1);
  useEffect(() => {
    if (!reduced) turned.value = withTiming(0, { duration: 480, easing: Easing.out(Easing.cubic) });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const turn = useAnimatedStyle(() => ({
    opacity: 1 - turned.value * 0.6,
    transform: [{ perspective: 1400 }, { rotateY: `${-75 * turned.value}deg` }],
  }));
  return <Animated.View style={[style, { transformOrigin: "left center" }, turn]}>{children}</Animated.View>;
}

// How a learning card comes in: turning like a page when the lab says so, otherwise
// sliding in from the right as it always has.
export function CardEnter({ style, children }) {
  const pageTurn = useLabPiece("pageTurn");
  if (pageTurn) return <FolioTurn style={style}>{children}</FolioTurn>;
  return (
    <Animated.View entering={FadeInRight.duration(260)} style={style}>
      {children}
    </Animated.View>
  );
}
