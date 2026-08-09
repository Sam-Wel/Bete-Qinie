import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, radii, spacing, typography } from "../../theme";

const VARIANTS = {
  primary: {
    bg: colors.primary,
    text: colors.onPrimary,
    border: colors.borderGold,
    gradient: gradients.goldButton,
  },
  secondary: { bg: colors.surfaceMuted, text: colors.textPrimary, border: colors.border },
  danger: { bg: colors.dangerLight, text: colors.dangerDark, border: colors.dangerDark },
  dangerConfirm: { bg: colors.danger, text: colors.white, border: colors.dangerDark },
  ghost: { bg: "transparent", text: colors.primary, border: "transparent" },
};

export function Button({
  variant = "primary",
  size = "md",
  pill = false,
  loading = false,
  disabled = false,
  onPress,
  children,
  style,
}) {
  const { bg, text, border, gradient } = VARIANTS[variant] ?? VARIANTS.primary;
  const isDisabled = disabled || loading;
  const isSmall = size === "sm";
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (isDisabled) return;
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const content = loading ? (
    <ActivityIndicator color={text} />
  ) : typeof children === "string" ? (
    <Text style={[isSmall ? typography.label : typography.button, { color: text }]}>{children}</Text>
  ) : (
    children
  );

  const shapeStyle = {
    borderRadius: pill ? radii.pill : radii.sm,
    borderWidth: border === "transparent" ? 0 : 1,
    borderColor: border,
    overflow: "hidden",
  };

  const paddingStyle = {
    paddingVertical: isSmall ? 6 : spacing.md,
    paddingHorizontal: isSmall ? spacing.md : spacing.lg,
  };

  const inner = (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[styles.base, paddingStyle]}
    >
      {content}
    </Pressable>
  );

  return (
    <Animated.View style={[animatedStyle, { opacity: isDisabled ? 0.6 : 1 }, shapeStyle, style]}>
      {gradient ? (
        <LinearGradient colors={gradient} style={styles.base}>
          {inner}
        </LinearGradient>
      ) : (
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isDisabled}
          style={[styles.base, paddingStyle, { backgroundColor: bg }]}
        >
          {content}
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
});
