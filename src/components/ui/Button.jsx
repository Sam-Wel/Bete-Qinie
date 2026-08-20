import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, radii, shadows, spacing, typography } from "../../theme";

const VARIANTS = {
  primary: {
    bg: colors.primary,
    text: colors.onPrimary,
    border: "transparent",
    gradient: gradients.goldButton,
  },
  secondary: {
    bg: colors.surfaceMuted,
    hoverBg: colors.border,
    text: colors.textPrimary,
    border: colors.border,
  },
  danger: { bg: colors.dangerLight, hoverBg: colors.dangerLight, text: colors.dangerDark, border: colors.dangerDark },
  dangerConfirm: { bg: colors.danger, hoverBg: colors.dangerDark, text: colors.white, border: "transparent" },
  ghost: { bg: "transparent", hoverBg: colors.primaryLight, text: colors.primary, border: "transparent" },
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
  const { bg, hoverBg, text, border, gradient } = VARIANTS[variant] ?? VARIANTS.primary;
  const isDisabled = disabled || loading;
  const isSmall = size === "sm";
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const [hovered, setHovered] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: lift.value }],
  }));

  const handlePressIn = () => {
    if (isDisabled) return;
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handleHoverIn = () => {
    if (isDisabled) return;
    setHovered(true);
    lift.value = withTiming(-1, { duration: 150 });
  };

  const handleHoverOut = () => {
    setHovered(false);
    lift.value = withTiming(0, { duration: 150 });
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

  const pressableProps = {
    onPress,
    onPressIn: handlePressIn,
    onPressOut: handlePressOut,
    onHoverIn: handleHoverIn,
    onHoverOut: handleHoverOut,
    disabled: isDisabled,
  };

  return (
    <Animated.View
      style={[animatedStyle, { opacity: isDisabled ? 0.6 : 1 }, shapeStyle, hovered && shadows.raised, style]}
    >
      {gradient ? (
        <LinearGradient colors={hovered ? gradients.goldButtonPressed : gradient} style={styles.base}>
          <Pressable {...pressableProps} style={[styles.base, paddingStyle]}>
            {content}
          </Pressable>
        </LinearGradient>
      ) : (
        <Pressable
          {...pressableProps}
          style={[styles.base, paddingStyle, { backgroundColor: hovered ? hoverBg ?? bg : bg }]}
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
