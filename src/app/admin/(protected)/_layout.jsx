import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../../context/AuthContext";

// Editors and admins get in; pages for admins alone wrap themselves in <AdminOnly>.
export default function ProtectedLayout() {
  const { canEdit, loading, user } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  // A layout route is expected to render a navigator. Rendering a screen here instead
  // leaves the router with a child route it cannot resolve, so both refusals redirect
  // to a route that owns its own screen.
  if (!user) return <Redirect href="/auth/sign-in" />;
  if (!canEdit) return <Redirect href="/admin/no-access" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
