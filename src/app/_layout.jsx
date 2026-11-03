import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Menbere_400Regular, Menbere_600SemiBold, Menbere_700Bold } from "@expo-google-fonts/menbere";
import { AuthProvider } from "../context/AuthContext";
import { WordProgressProvider } from "../context/WordProgressContext";

SplashScreen.preventAutoHideAsync();

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
        </WordProgressProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
