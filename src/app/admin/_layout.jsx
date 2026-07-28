import { Stack } from "expo-router";

// Phase 5 will wrap this in an auth guard that redirects to /admin/login
// when there is no Supabase session.
export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Admin" }} />
    </Stack>
  );
}
