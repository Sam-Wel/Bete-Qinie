import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useWindowDimensions } from "../hooks/useWindowDimensions";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fontFamily, radii, spacing, typography } from "../theme";

// Short messages that slide up above the tab bar and go away by themselves, with an
// optional action ("Undo"). Callable from anywhere:
//   toast("Saved to ክለሳ", { action: { label: "Undo", onPress: () => … } })
//   toast("Couldn't save", { tone: "error" })
// One at a time: a new toast replaces the one showing.

let show = null;
let pending = null;

export function toast(text, { action = null, tone = "info", duration } = {}) {
  const item = { id: Date.now() + Math.random(), text, action, tone, duration: duration ?? (action ? 5000 : 2800) };
  if (show) show(item);
  else pending = item; // the host isn't up yet (the first render); show it when it is
}

const PHONE_TAB_BAR = 74;

// Rendered once, at the root of the app.
export function ToastHost() {
  const [item, setItem] = useState(null);
  const timer = useRef(null);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const phone = width < 900; // the bottom tab bar shows below this width

  useEffect(() => {
    show = (next) => {
      clearTimeout(timer.current);
      setItem(next);
      timer.current = setTimeout(() => setItem(null), next.duration);
    };
    if (pending) {
      show(pending);
      pending = null;
    }
    return () => {
      show = null;
      clearTimeout(timer.current);
    };
  }, []);

  const dismiss = () => {
    clearTimeout(timer.current);
    setItem(null);
  };

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: (phone ? PHONE_TAB_BAR : 0) + insets.bottom + spacing.md }]}>
      {item ? (
        <Animated.View
          key={item.id}
          entering={FadeInDown.springify().damping(18).stiffness(220)}
          exiting={FadeOutDown.duration(160)}
          style={[styles.toast, item.tone === "error" && styles.toastError]}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <Pressable onPress={dismiss} style={styles.textWrap} accessibilityLabel={`${item.text}. Tap to dismiss.`}>
            <Text style={styles.text}>{item.text}</Text>
          </Pressable>
          {item.action ? (
            <Pressable
              onPress={() => {
                dismiss();
                item.action.onPress();
              }}
              hitSlop={8}
              accessibilityRole="button"
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            >
              <Text style={styles.actionText}>{item.action.label}</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

// Fixed colours, the same in light and dark mode: a dark pill reads on both.
const styles = StyleSheet.create({
  host: { position: "absolute", left: 0, right: 0, alignItems: "center", paddingHorizontal: spacing.lg, zIndex: 1000 },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    maxWidth: 520,
    width: "100%",
    minHeight: 48,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: "#2B2013",
    borderWidth: 1,
    borderColor: "#5a4422",
    boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
  },
  toastError: { borderColor: "#C9543B", backgroundColor: "#3a1c14" },
  textWrap: { flex: 1, paddingVertical: spacing.sm },
  text: { ...typography.body, fontSize: 15, lineHeight: 21, color: "#FBF6EA" },
  action: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.md },
  actionPressed: { backgroundColor: "rgba(242,193,78,0.15)" },
  actionText: { fontFamily: fontFamily.latinBold, fontSize: 15, color: "#F2C14E" },
});
