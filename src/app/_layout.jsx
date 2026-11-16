import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack, router, useRootNavigationState } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Menbere_400Regular, Menbere_600SemiBold, Menbere_700Bold } from "@expo-google-fonts/menbere";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { WordProgressProvider } from "../context/WordProgressContext";
import { ToastHost, toast } from "../components/Toast";

SplashScreen.preventAutoHideAsync();

// Losing and finding the connection, said once each time (answers are kept on the
// device meanwhile and sent when it's back).
function ConnectionToasts() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
    const offline = () => toast("You're offline. Your answers are saved on this device.", { duration: 4500 });
    const online = () => toast("Back online.");
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, []);
  return null;
}

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
          <ConnectionToasts />
          <ToastHost />
        </WordProgressProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
