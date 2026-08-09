import { Stack } from "expo-router";

export default function BlogLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "ቅኔ አበው" }} />
      <Stack.Screen name="[id]" options={{ title: "" }} />
    </Stack>
  );
}
