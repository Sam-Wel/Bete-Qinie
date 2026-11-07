import { Stack } from "expo-router";

export default function ZemaLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "ዜማ" }} />
      <Stack.Screen name="[id]" options={{ title: "" }} />
    </Stack>
  );
}
