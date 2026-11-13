import { useCallback, useRef } from "react";
import { Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { gradients, spacing } from "../../theme";

// Each time a screen comes into view it fades and rises in a little, like a native
// app's page change, instead of appearing all at once.
function useEnterAnimation() {
  const progress = useRef(new Animated.Value(1)).current;
  useFocusEffect(
    useCallback(() => {
      progress.setValue(0);
      Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== "web" }).start();
    }, [progress])
  );
  return {
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  };
}

export function ScreenContainer({
  scroll = false,
  keyboardAvoiding = false,
  center = false,
  style,
  contentContainerStyle,
  children,
}) {
  const enter = useEnterAnimation();
  const content = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        {
          padding: spacing.lg,
          flexGrow: 1,
          minHeight: center ? "100%" : undefined,
          width: "100%",
          maxWidth: 760,
          alignSelf: "center",
          alignItems: center ? "center" : "stretch",
          justifyContent: center ? "center" : "flex-start",
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        {
          flex: 1,
          padding: spacing.lg,
          width: "100%",
          maxWidth: 760,
          alignSelf: "center",
          alignItems: center ? "center" : "stretch",
          justifyContent: center ? "center" : "flex-start",
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  const wrapped = (
    <View style={[{ flex: 1 }, style]}>
      <LinearGradient colors={gradients.parchmentBackground} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "transparent" }}>
        <Animated.View style={[{ flex: 1 }, enter]}>{content}</Animated.View>
      </SafeAreaView>
    </View>
  );

  if (!keyboardAvoiding) return wrapped;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {wrapped}
    </KeyboardAvoidingView>
  );
}
