import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { gradients, spacing } from "../../theme";

export function ScreenContainer({
  scroll = false,
  keyboardAvoiding = false,
  center = false,
  style,
  contentContainerStyle,
  children,
}) {
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
        {content}
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
