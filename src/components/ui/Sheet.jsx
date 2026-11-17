import { useEffect, useRef, useState } from "react";
import { Modal, PanResponder, Platform, Pressable, StyleSheet, View } from "react-native";
import { useWindowDimensions } from "../../hooks/useWindowDimensions";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, spacing } from "../../theme";

const OUT = 640; // how far below the screen a closed sheet sits

// A panel that slides up from the bottom on phones, with a handle you can drag down to
// close; on wider screens, a dialog in the middle. Closes on the backdrop too.
// The parent owns `visible`; this keeps itself on screen while it animates out.
export function Sheet({ visible, onClose, label, children, maxWidth = 520 }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const phone = width < 600;
  const [mounted, setMounted] = useState(visible);
  const [keyboard, setKeyboard] = useState(0);
  const shift = useSharedValue(phone ? OUT : 0); // phones: px below its place
  const shown = useSharedValue(0); // 0 → 1: backdrop, and the dialog's fade/scale

  useEffect(() => {
    if (visible) {
      setMounted(true);
      shift.value = phone ? OUT : 0;
      shown.value = 0;
      shift.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
      shown.value = withTiming(1, { duration: 220 });
    } else if (mounted) {
      shown.value = withTiming(0, { duration: 180 });
      shift.value = withTiming(phone ? OUT : 0, { duration: 200, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // iPhone web apps don't move fixed panels above the keyboard: lift the sheet by the
  // keyboard's height while it is open.
  useEffect(() => {
    if (Platform.OS !== "web" || !mounted || typeof window === "undefined" || !window.visualViewport) return undefined;
    const viewport = window.visualViewport;
    const update = () => setKeyboard(Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop)));
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [mounted]);

  // Drag down from the top of the sheet to close it.
  const drag = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        shift.value = Math.max(0, g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 90 || g.vy > 0.8) onCloseRef.current?.();
        else shift.value = withSpring(0, { damping: 20, stiffness: 260 });
      },
    })
  ).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const backdropStyle = useAnimatedStyle(() => ({ opacity: shown.value }));
  const sheetStyle = useAnimatedStyle(() =>
    phone
      ? { transform: [{ translateY: shift.value }] }
      : { opacity: shown.value, transform: [{ scale: 0.96 + 0.04 * shown.value }] }
  );

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={[styles.root, phone ? styles.rootPhone : styles.rootWide]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={label}
          style={[
            styles.sheet,
            phone ? styles.sheetPhone : [styles.sheetWide, { maxWidth }],
            phone && { paddingBottom: insets.bottom + spacing.lg, marginBottom: keyboard, maxHeight: height * 0.92 - keyboard },
            sheetStyle,
          ]}
        >
          {phone ? (
            <View {...drag.panHandlers} style={styles.handleArea} accessibilityLabel="Drag down to close">
              <View style={styles.handle} />
            </View>
          ) : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  rootPhone: { justifyContent: "flex-end" },
  rootWide: { justifyContent: "center", alignItems: "center", padding: spacing.lg },
  backdrop: { backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: colors.surface, borderColor: colors.border, gap: spacing.sm },
  sheetPhone: {
    width: "100%",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg + 2,
    paddingTop: 0,
  },
  sheetWide: { width: "100%", borderRadius: radii.lg + 4, borderWidth: 1, padding: spacing.lg + 2 },
  handleArea: { alignItems: "center", paddingTop: 10, paddingBottom: 6, marginHorizontal: -spacing.lg },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border },
});
