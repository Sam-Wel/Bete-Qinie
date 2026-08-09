import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../../context/AuthContext";

export default function ProtectedLayout() {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!isAdmin) {
    return <Redirect href="/auth/sign-in" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
