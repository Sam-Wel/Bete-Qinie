import { useEffect } from "react";
import { Stack, router, useRootNavigationState } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Menbere_400Regular, Menbere_600SemiBold, Menbere_700Bold } from "@expo-google-fonts/menbere";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { WordProgressProvider } from "../context/WordProgressContext";

SplashScreen.preventAutoHideAsync();

// A "set a new password" link signs the person in for that one purpose; send them to the
// form wherever the link landed.
function PasswordRecoveryRedirect() {
  const { passwordRecovery } = useAuth();
  const navigation = useRootNavigationState();
  useEffect(() => {
    if (passwordRecovery && navigation?.key) router.replace("/auth/reset-password");
  }, [passwordRecovery, navigation?.key]);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Menbere_400Regular,
    Menbere_600SemiBold,
    Menbere_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <WordProgressProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(app)" />
            <Stack.Screen name="admin" />
            <Stack.Screen name="auth" />
          </Stack>
          <PasswordRecoveryRedirect />
        </WordProgressProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
